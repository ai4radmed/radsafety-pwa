/**
 * 감시 결과 → bulletins 수집. 명세: .spec/src/lib/bulletins/ingest.md
 *
 * /api/cron/watch 가 소스별 runSource 뒤에 호출한다. 감시 엔진(watch_items)은 "무엇이 바뀌었나"를,
 * 이 모듈은 "사건 레코드를 어떻게 만들까"를 맡는다 — 둘을 섞지 않아 baseline(최초 실행)에도 백필이 된다.
 *
 * 규칙
 *  - NSIC: 전량이 사건. 최초(테이블에 nsic 0건)엔 published 로 백필(이미 정제된 공개 사례집), 이후 신규는 pending.
 *  - NSSC: 관련(relevant) 건만 사건 후보(pending). 나머지는 bulletins 에 넣지 않는다(회의 개최·IAEA 등).
 *  - 스레드 후보(suggested_parent_id): NSIC 신규가 들어올 때 앞선 원안위 속보(nssc, ignored 아님) 중
 *    사고일 기준 -SUGGEST_WINDOW_DAYS ~ +SUGGEST_WINDOW_DAYS 안의 가장 가까운 것. 확정은 관리자.
 *  - 이미 있는 (source, external_id) 는 건드리지 않는다(관리자가 편집한 요약·메모 보존).
 */

import { supabaseAdmin } from '../supabase-server';
import { createLogger } from '../logger';
import { fetchNsicDetail } from '../watch/sources/nsic-accidents';
import type { WatchItem } from '../watch/types';

const logger = createLogger('bulletins-ingest');

export const SUGGEST_WINDOW_DAYS = 60;

export type BulletinSource = 'nsic' | 'nssc';

/** watch 소스 id → bulletins.source. 대상이 아니면 null. */
export function bulletinSourceOf(watchSourceId: string): BulletinSource | null {
    if (watchSourceId === 'nsic-accidents') return 'nsic';
    if (watchSourceId === 'nssc-press') return 'nssc';
    return null;
}

export interface BulletinInsert {
    source: BulletinSource;
    external_id: string;
    title: string;
    occurred_at: string | null;
    incident_type: string | null;
    incident_grade: string | null;
    region: string | null;
    org_masked: string | null;
    source_url: string;
    summary: string | null;
    cause: string | null;
    relevant: boolean;
    status: 'pending' | 'published';
    suggested_parent_id: string | null;
    published_at: string | null;
}

/** 'YYYY.MM.DD' | 'YYYY-MM-DD' → 'YYYY-MM-DD' (그 외 null) */
export function toIsoDate(s: string | undefined): string | null {
    if (!s) return null;
    const m = /^(\d{4})[.-](\d{2})[.-](\d{2})/.exec(s.trim());
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 어떤 항목을 사건 후보로 넣을지·어떤 상태로 넣을지 — 순수. */
export function planIngest(
    source: BulletinSource,
    items: WatchItem[],
    existingIds: Set<string>,
    options: { firstRun: boolean },
): { item: WatchItem; status: 'pending' | 'published' }[] {
    const fresh = items.filter((i) => !existingIds.has(i.externalId));
    if (source === 'nssc') {
        return fresh.filter((i) => i.detail?.relevant === 'Y').map((item) => ({ item, status: 'pending' as const }));
    }
    // nsic: 최초 백필은 published, 이후 신규는 pending
    return fresh.map((item) => ({ item, status: options.firstRun ? ('published' as const) : ('pending' as const) }));
}

export interface ParentCandidate {
    id: string;
    occurred_at: string | null;
}

/** 사고일에서 ±SUGGEST_WINDOW_DAYS 안의 가장 가까운 속보 — 순수. 없으면 null. */
export function suggestParent(occurredAt: string | null, candidates: ParentCandidate[]): string | null {
    if (!occurredAt) return null;
    const t = Date.parse(occurredAt);
    if (Number.isNaN(t)) return null;
    let best: { id: string; diff: number } | null = null;
    for (const c of candidates) {
        if (!c.occurred_at) continue;
        const ct = Date.parse(c.occurred_at);
        if (Number.isNaN(ct)) continue;
        const diff = Math.abs(ct - t) / 86400000;
        if (diff > SUGGEST_WINDOW_DAYS) continue;
        if (!best || diff < best.diff) best = { id: c.id, diff };
    }
    return best?.id ?? null;
}

async function existingExternalIds(source: BulletinSource): Promise<Set<string>> {
    const { data, error } = await supabaseAdmin.from('bulletins').select('external_id').eq('source', source);
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((r) => r.external_id as string));
}

async function pressCandidates(): Promise<ParentCandidate[]> {
    const { data, error } = await supabaseAdmin
        .from('bulletins')
        .select('id, occurred_at')
        .eq('source', 'nssc')
        .neq('status', 'ignored')
        .is('parent_id', null);
    if (error) throw new Error(error.message);
    return (data ?? []) as ParentCandidate[];
}

export interface IngestResult {
    source: BulletinSource;
    inserted: number;
    backfilled: boolean;
    pendingTitles: string[];
    error?: string;
}

/**
 * 한 소스의 수집 항목을 bulletins 에 반영. throw 하지 않고 결과로 보고(cron 이 다음 소스로 계속).
 * NSIC 신규는 상세(개요·원인)를 건별로 받는다 — 백필 103건은 최초 1회뿐, 이후는 월 몇 건.
 */
export async function ingestBulletins(
    watchSourceId: string,
    items: WatchItem[] | undefined,
    options: { persist: boolean },
): Promise<IngestResult | null> {
    const source = bulletinSourceOf(watchSourceId);
    if (!source || !items) return null;
    try {
        const existing = await existingExternalIds(source);
        const firstRun = existing.size === 0;
        const plan = planIngest(source, items, existing, { firstRun });
        const result: IngestResult = {
            source,
            inserted: 0,
            backfilled: firstRun && plan.length > 0,
            pendingTitles: [],
        };
        if (!plan.length || !options.persist) {
            result.pendingTitles = plan.filter((p) => p.status === 'pending').map((p) => p.item.title);
            return result;
        }

        const candidates = source === 'nsic' ? await pressCandidates() : [];
        const rows: BulletinInsert[] = [];
        for (const { item, status } of plan) {
            const d = item.detail ?? {};
            let summary: string | null = null;
            let cause: string | null = null;
            if (source === 'nsic') {
                try {
                    const detail = await fetchNsicDetail(item.externalId);
                    summary = detail.summary || null;
                    cause = detail.cause || null;
                } catch (err) {
                    logger.warn('NSIC 상세 조회 실패 — 목록 정보만 저장', { id: item.externalId, err });
                }
            }
            const occurredAt = toIsoDate(d.occurredAt ?? d.writeDate);
            rows.push({
                source,
                external_id: item.externalId,
                title: item.title,
                occurred_at: occurredAt,
                incident_type: source === 'nsic' ? (item.category ?? null) : null,
                incident_grade: d.grade ?? null,
                region: d.region ?? null,
                org_masked: d.org ?? null,
                source_url: d.url ?? '',
                summary,
                cause,
                relevant: d.relevant === 'Y',
                status,
                suggested_parent_id: source === 'nsic' ? suggestParent(occurredAt, candidates) : null,
                published_at: status === 'published' ? new Date().toISOString() : null,
            });
        }

        // 이미 있는 행은 보존(ignoreDuplicates) — 관리자 편집 덮어쓰기 금지.
        const { error } = await supabaseAdmin
            .from('bulletins')
            .upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);

        result.inserted = rows.length;
        result.pendingTitles = rows.filter((r) => r.status === 'pending').map((r) => r.title);
        logger.info('bulletins 수집', { source, inserted: rows.length, backfilled: result.backfilled });
        return result;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('bulletins 수집 실패', { source, message });
        return { source, inserted: 0, backfilled: false, pendingTitles: [], error: message };
    }
}
