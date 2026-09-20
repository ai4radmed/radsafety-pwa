/**
 * WatchStore 의 Supabase 구현 — watch_items / watch_sources (sql_query/migrate_add_watch_tables.sql).
 * 명세: .spec/src/lib/watch/engine.md §스토어. 서비스 롤 전용(두 테이블에 클라이언트 정책 없음).
 */

import { supabaseAdmin } from '../supabase-server';
import type { SourceState, StoredItem, WatchItem, WatchStore } from './types';

function required<T>(value: T, error: { message: string } | null): T {
    if (error) throw new Error(error.message);
    return value;
}

export const supabaseWatchStore: WatchStore = {
    async loadSourceState(source): Promise<SourceState | null> {
        const { data, error } = await supabaseAdmin
            .from('watch_sources')
            .select('last_count, consecutive_failures, baseline_at')
            .eq('source', source)
            .maybeSingle();
        required(data, error);
        if (!data) return null;
        return {
            lastCount: data.last_count ?? null,
            consecutiveFailures: data.consecutive_failures ?? 0,
            baselineAt: data.baseline_at ?? null,
        };
    },

    async loadItems(source): Promise<StoredItem[]> {
        const { data, error } = await supabaseAdmin
            .from('watch_items')
            .select('external_id, fingerprint, missing_count, removed_at')
            .eq('source', source);
        const rows = required(data, error) ?? [];
        return rows.map((r) => ({
            externalId: r.external_id,
            fingerprint: r.fingerprint,
            missingCount: r.missing_count ?? 0,
            removedAt: r.removed_at ?? null,
        }));
    },

    async upsertSeen(source, items: WatchItem[], changedIds, now): Promise<void> {
        if (!items.length) return;
        // changed_at 은 바뀐 건만 갱신해야 하므로 두 묶음으로 나눠 upsert 한다.
        const toRow = (item: WatchItem, changed: boolean) => ({
            source,
            external_id: item.externalId,
            title: item.title,
            category: item.category ?? null,
            fingerprint: item.fingerprint,
            detail: item.detail ?? null,
            last_seen_at: now,
            missing_count: 0,
            removed_at: null,
            ...(changed ? { changed_at: now } : {}),
        });
        const unchanged = items.filter((i) => !changedIds.has(i.externalId)).map((i) => toRow(i, false));
        const changed = items.filter((i) => changedIds.has(i.externalId)).map((i) => toRow(i, true));
        for (const batch of [unchanged, changed]) {
            if (!batch.length) continue;
            const { error } = await supabaseAdmin
                .from('watch_items')
                .upsert(batch, { onConflict: 'source,external_id' });
            if (error) throw new Error(error.message);
        }
    },

    async markMissing(source, items, removedIds, now): Promise<void> {
        for (const item of items) {
            const patch = removedIds.has(item.externalId)
                ? { missing_count: item.missingCount + 1, removed_at: now }
                : { missing_count: item.missingCount + 1 };
            const { error } = await supabaseAdmin
                .from('watch_items')
                .update(patch)
                .eq('source', source)
                .eq('external_id', item.externalId);
            if (error) throw new Error(error.message);
        }
    },

    async saveSourceState(source, patch): Promise<void> {
        const row: Record<string, unknown> = { source };
        if (patch.lastRunAt !== undefined) row.last_run_at = patch.lastRunAt;
        if (patch.lastOkAt !== undefined) row.last_ok_at = patch.lastOkAt;
        if (patch.lastCount !== undefined) row.last_count = patch.lastCount;
        if (patch.consecutiveFailures !== undefined) row.consecutive_failures = patch.consecutiveFailures;
        if (patch.lastError !== undefined) row.last_error = patch.lastError;
        if (patch.baselineAt !== undefined) row.baseline_at = patch.baselineAt;
        const { error } = await supabaseAdmin.from('watch_sources').upsert(row, { onConflict: 'source' });
        if (error) throw new Error(error.message);
    },
};
