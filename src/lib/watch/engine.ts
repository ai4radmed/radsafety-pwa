/**
 * 외부 게시판 갱신 감시 엔진 — 집합 비교 + 안전장치. 명세: .spec/src/lib/watch/engine.md
 *
 * 순수 함수(computeDiff·isSuspiciousDrop)와 실행기(runSource)로 나뉜다. 실행기는 WatchStore 계약만
 * 알고 Supabase 를 모른다 — 테스트는 메모리 스토어로 돈다.
 */

import { createLogger } from '../logger';
import type { SourceRunResult, StoredItem, WatchDiff, WatchItem, WatchSource, WatchStore } from './types';

const logger = createLogger('watch');

/** 이 횟수만큼 연속으로 목록에서 안 보이면 삭제 확정. 하루 1회 실행이라 이틀. */
export const MISSING_THRESHOLD = 2;

/** 이 횟수 이상 연속 실패면 관리자 텔레그램 경고 대상. */
export const FAILURE_ALERT_THRESHOLD = 3;

/**
 * 급감 판정 — 0건이거나 직전 정상 건수의 절반 미만이면 KINS 장애·응답 변경으로 본다.
 * 이때 diff 를 돌리면 전부 "삭제"로 오판하므로 실행을 실패로 취급한다.
 */
export function isSuspiciousDrop(previousCount: number | null, nextCount: number): boolean {
    if (nextCount === 0) return true;
    if (previousCount === null || previousCount <= 0) return false;
    return nextCount < previousCount / 2;
}

/** 집합 비교. 삭제 확정 행(removedAt)이 다시 보이면 "신규"로 취급한다. */
export function computeDiff(existing: StoredItem[], next: WatchItem[]): WatchDiff {
    const byId = new Map(existing.map((e) => [e.externalId, e]));
    const seen = new Set<string>();
    const added: WatchItem[] = [];
    const changed: WatchItem[] = [];

    for (const item of next) {
        seen.add(item.externalId);
        const prev = byId.get(item.externalId);
        if (!prev || prev.removedAt) added.push(item);
        else if (prev.fingerprint !== item.fingerprint) changed.push(item);
    }

    const missing = existing.filter((e) => !e.removedAt && !seen.has(e.externalId));
    return { added, changed, missing };
}

/** 한 소스를 한 번 실행. 어떤 경우에도 throw 하지 않고 결과 객체로 보고한다(다른 소스를 막지 않기 위해). */
export async function runSource(
    source: WatchSource,
    store: WatchStore,
    options: { persist?: boolean; now?: Date } = {},
): Promise<SourceRunResult> {
    try {
        return await runSourceInner(source, store, options);
    } catch (err) {
        // 스토어 오류(테이블 미생성·DB 장애 등). 수집 오류는 inner 가 이미 결과로 바꿨다.
        const message = err instanceof Error ? err.message : String(err);
        logger.error('감시 실행 중 스토어 오류', { source: source.id, message });
        return {
            source: source.id,
            label: source.label,
            status: 'error',
            count: 0,
            added: [],
            changed: [],
            removed: [],
            consecutiveFailures: FAILURE_ALERT_THRESHOLD, // 상태를 못 읽었으니 곧바로 경고 대상
            error: `store: ${message}`,
        };
    }
}

async function runSourceInner(
    source: WatchSource,
    store: WatchStore,
    options: { persist?: boolean; now?: Date },
): Promise<SourceRunResult> {
    const persist = options.persist ?? true;
    const nowIso = (options.now ?? new Date()).toISOString();
    const base = { source: source.id, label: source.label, added: [], changed: [], removed: [] as string[] };

    const state = await store.loadSourceState(source.id);
    const failures = state?.consecutiveFailures ?? 0;

    let items: WatchItem[];
    try {
        items = await source.fetchItems();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('감시 소스 수집 실패', { source: source.id, message, failures: failures + 1 });
        if (persist) {
            await store.saveSourceState(source.id, {
                lastRunAt: nowIso,
                consecutiveFailures: failures + 1,
                lastError: message,
            });
        }
        return { ...base, status: 'error', count: 0, consecutiveFailures: failures + 1, error: message };
    }

    // window 소스(최신 N건 게시판)는 건수가 창 크기로 고정이라 급감 판정은 0건일 때만 의미 있다.
    const windowed = source.mode === 'window';
    if (windowed ? items.length === 0 : isSuspiciousDrop(state?.lastCount ?? null, items.length)) {
        const message = `건수 급감: ${state?.lastCount ?? '-'} → ${items.length}`;
        logger.warn('감시 소스 급감 — diff 생략', { source: source.id, message });
        if (persist) {
            await store.saveSourceState(source.id, {
                lastRunAt: nowIso,
                consecutiveFailures: failures + 1,
                lastError: message,
            });
        }
        return {
            ...base,
            status: 'suspicious',
            count: items.length,
            consecutiveFailures: failures + 1,
            error: message,
        };
    }

    const existing = await store.loadItems(source.id);

    // 최초 실행 = baseline. 기존 전부를 신규로 알리면 폭주하므로 저장만 한다.
    if (existing.length === 0) {
        if (persist) {
            await store.upsertSeen(source.id, items, new Set(), nowIso);
            await store.saveSourceState(source.id, {
                lastRunAt: nowIso,
                lastOkAt: nowIso,
                lastCount: items.length,
                consecutiveFailures: 0,
                lastError: null,
                baselineAt: nowIso,
            });
        }
        logger.info(persist ? '감시 baseline 저장' : '감시 baseline (dry — 저장 안 함)', {
            source: source.id,
            count: items.length,
        });
        return { ...base, status: 'baseline', count: items.length, consecutiveFailures: 0, items };
    }

    const diff = computeDiff(existing, items);
    // window 소스: 창 밖으로 밀려난 옛 글은 삭제가 아니다 — 누락·삭제 판정 생략.
    if (windowed) diff.missing = [];
    const removedIds = new Set(
        diff.missing.filter((m) => m.missingCount + 1 >= MISSING_THRESHOLD).map((m) => m.externalId),
    );

    if (persist) {
        await store.upsertSeen(source.id, items, new Set(diff.changed.map((c) => c.externalId)), nowIso);
        if (diff.missing.length) await store.markMissing(source.id, diff.missing, removedIds, nowIso);
        await store.saveSourceState(source.id, {
            lastRunAt: nowIso,
            lastOkAt: nowIso,
            lastCount: items.length,
            consecutiveFailures: 0,
            lastError: null,
        });
    }

    logger.info('감시 실행 완료', {
        source: source.id,
        count: items.length,
        added: diff.added.length,
        changed: diff.changed.length,
        missing: diff.missing.length,
        removed: removedIds.size,
    });

    return {
        ...base,
        status: 'ok',
        count: items.length,
        added: diff.added,
        changed: diff.changed,
        removed: [...removedIds],
        consecutiveFailures: 0,
        items,
    };
}
