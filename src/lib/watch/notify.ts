/**
 * 감시 결과 → 회원 알림(앱 내 + 웹푸시) + 관리자 텔레그램. 명세: .spec/src/lib/watch/notify.md
 *
 * 회원 알림은 소스당 실행당 1건으로 묶는다(여러 건이 한 번에 올라와도 알림 폭주 없음).
 * 삭제는 회원에게 알리지 않고 관리자 텔레그램에만 적는다.
 */

import { supabaseAdmin } from '../supabase-server';
import { createBulkNotifications } from '../notification-helper';
import { sendTelegramMessage } from '../telegram';
import { createLogger } from '../logger';
import { FAILURE_ALERT_THRESHOLD } from './engine';
import type { SourceRunResult, WatchItem, WatchSource } from './types';

const logger = createLogger('watch-notify');

const MAX_LISTED = 5;

function itemLine(item: WatchItem): string {
    const tag = item.detail?.mngNo ? `[${item.detail.mngNo}] ` : '';
    const cat = item.category ? `${item.category} · ` : '';
    return `${tag}${cat}${item.title}`;
}

/** 회원 알림 문안. 신규·수정이 없으면 null. */
export function buildMemberNotification(
    source: WatchSource,
    result: SourceRunResult,
): { title: string; message: string } | null {
    const total = result.added.length + result.changed.length;
    if (total === 0) return null;

    const parts: string[] = [];
    if (result.added.length) parts.push(`신규 ${result.added.length}건`);
    if (result.changed.length) parts.push(`수정 ${result.changed.length}건`);
    const title = `${source.label} ${parts.join(' · ')}`;

    const lines = [...result.added, ...result.changed].slice(0, MAX_LISTED).map(itemLine);
    if (total > MAX_LISTED) lines.push(`… 외 ${total - MAX_LISTED}건`);
    lines.push(`경로: ${source.guide}`);
    return { title, message: lines.join('\n') };
}

/**
 * 보고 모드 — env WATCH_REPORT (health.yml 의 HEALTH_REPORT 와 같은 발상, 코드 변경·재배포 없이 Vercel env 로 전환).
 *   all     : 매 실행 보고 — 변화 없어도 "변화 없음 · N건" 하트비트(기본. 2026-09-20 Dr. Ben — 점검 프로세스 생존 확인용)
 *   changes : 변화·baseline·연속 실패(≥3)만 — 장기 운영 모드
 * env 값이 둘 다 아니면 all.
 */
export type WatchReportMode = 'all' | 'changes';

export function getWatchReportMode(): WatchReportMode {
    const raw = import.meta.env.WATCH_REPORT || (typeof process !== 'undefined' ? process.env.WATCH_REPORT : undefined);
    return raw === 'changes' ? 'changes' : 'all';
}

/** 관리자 텔레그램 문안. changes 모드에서 알릴 것(변화·삭제·baseline·연속 실패)이 없으면 null. all 모드는 항상 문안. */
export function buildAdminSummary(results: SourceRunResult[], mode: WatchReportMode = 'changes'): string | null {
    const lines: string[] = [];
    let notable = false;
    for (const r of results) {
        if (r.status === 'ok' && (r.added.length || r.changed.length || r.removed.length)) {
            notable = true;
            lines.push(
                `${r.label}: 신규 ${r.added.length} · 수정 ${r.changed.length} · 삭제 ${r.removed.length} (총 ${r.count}건)`,
            );
            for (const item of [...r.added, ...r.changed].slice(0, MAX_LISTED)) lines.push(`  - ${itemLine(item)}`);
        } else if (r.status === 'ok') {
            lines.push(`${r.label}: 변화 없음 (${r.count}건)`);
        } else if (r.status === 'baseline') {
            notable = true;
            lines.push(`${r.label}: baseline 저장 ${r.count}건 (알림 없음)`);
        } else if (r.consecutiveFailures >= FAILURE_ALERT_THRESHOLD) {
            notable = true;
            lines.push(`${r.label}: ${r.consecutiveFailures}회 연속 실패 — ${r.error ?? ''}`);
        } else {
            lines.push(`${r.label}: 실패 ${r.consecutiveFailures}회째 — ${r.error ?? ''} (3회부터 경고)`);
        }
    }
    if (mode === 'changes' && !notable) return null;
    if (!lines.length) return null;
    const head = mode === 'all' && !notable ? '[RadSafety] KINS 자원 감시 — 변화 없음' : '[RadSafety] KINS 자원 감시';
    return [head, ...lines].join('\n');
}

async function activeMemberIds(): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('status', 'active');
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.id);
}

/** 결과를 회원·관리자에게 전달. 전달 실패는 로그만 남기고 cron 응답을 실패로 바꾸지 않는다. */
export async function notifyWatchResults(
    sources: WatchSource[],
    results: SourceRunResult[],
): Promise<{ memberNotified: number; telegram: boolean }> {
    let memberNotified = 0;
    const byId = new Map(sources.map((s) => [s.id, s]));

    for (const result of results) {
        const source = byId.get(result.source);
        if (!source) continue;
        const note = buildMemberNotification(source, result);
        if (!note) continue;
        try {
            const ids = await activeMemberIds();
            if (!ids.length) continue;
            await createBulkNotifications(ids, {
                type: 'system_notice',
                title: note.title,
                message: note.message,
                link: source.link,
                priority: 'normal',
                expiresInDays: 60,
                metadata: { watch: result.source, added: result.added.length, changed: result.changed.length },
            });
            memberNotified += ids.length;
        } catch (err) {
            logger.error('감시 회원 알림 실패', { source: result.source, err });
        }
    }

    let telegram = false;
    const summary = buildAdminSummary(results, getWatchReportMode());
    if (summary) {
        try {
            telegram = await sendTelegramMessage(summary);
        } catch (err) {
            logger.error('감시 텔레그램 실패', { err });
        }
    }

    return { memberNotified, telegram };
}
