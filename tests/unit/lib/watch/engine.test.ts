import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { computeDiff, isSuspiciousDrop, runSource, MISSING_THRESHOLD } from '../../../../src/lib/watch/engine';
import type { SourceState, StoredItem, WatchItem, WatchSource, WatchStore } from '../../../../src/lib/watch/types';

function item(id: string, fp = `fp-${id}`, title = `제목 ${id}`): WatchItem {
    return { externalId: id, title, fingerprint: fp, category: null };
}

/** 테스트용 메모리 스토어 — 엔진이 호출한 내용을 그대로 기록한다. */
function memoryStore(seed: { state?: SourceState | null; items?: StoredItem[] } = {}) {
    const items = new Map<string, StoredItem>((seed.items ?? []).map((i) => [i.externalId, i]));
    let state: SourceState | null = seed.state ?? null;
    const calls: string[] = [];
    const store: WatchStore & { items: typeof items; state: () => SourceState | null; calls: string[] } = {
        items,
        state: () => state,
        calls,
        async loadSourceState() {
            return state;
        },
        async loadItems() {
            return [...items.values()];
        },
        async upsertSeen(_s, next, changedIds) {
            calls.push(`upsert:${next.length}:changed=${changedIds.size}`);
            for (const n of next) {
                items.set(n.externalId, {
                    externalId: n.externalId,
                    fingerprint: n.fingerprint,
                    missingCount: 0,
                    removedAt: null,
                });
            }
        },
        async markMissing(_s, missing, removedIds, now) {
            calls.push(`missing:${missing.length}:removed=${removedIds.size}`);
            for (const m of missing) {
                items.set(m.externalId, {
                    ...m,
                    missingCount: m.missingCount + 1,
                    removedAt: removedIds.has(m.externalId) ? now : m.removedAt,
                });
            }
        },
        async saveSourceState(_s, patch) {
            calls.push(`state:${patch.consecutiveFailures ?? '-'}`);
            state = {
                lastCount: patch.lastCount ?? state?.lastCount ?? null,
                consecutiveFailures: patch.consecutiveFailures ?? state?.consecutiveFailures ?? 0,
                baselineAt: patch.baselineAt ?? state?.baselineAt ?? null,
            };
        },
    };
    return store;
}

function source(items: WatchItem[] | Error): WatchSource {
    return {
        id: 'test',
        label: '테스트 소스',
        guide: '경로',
        link: '/kins',
        fetchItems: async () => {
            if (items instanceof Error) throw items;
            return items;
        },
    };
}

describe('watch/engine isSuspiciousDrop', () => {
    it('0건은 항상 의심', () => {
        expect(isSuspiciousDrop(null, 0)).toBe(true);
        expect(isSuspiciousDrop(100, 0)).toBe(true);
    });
    it('직전 건수가 없으면(최초) 의심하지 않는다', () => {
        expect(isSuspiciousDrop(null, 5)).toBe(false);
    });
    it('절반 미만이면 의심, 절반 이상이면 정상', () => {
        expect(isSuspiciousDrop(158, 78)).toBe(true);
        expect(isSuspiciousDrop(158, 79)).toBe(false);
        expect(isSuspiciousDrop(158, 200)).toBe(false);
    });
});

describe('watch/engine computeDiff', () => {
    const existing: StoredItem[] = [
        { externalId: 'a', fingerprint: 'fp-a', missingCount: 0, removedAt: null },
        { externalId: 'b', fingerprint: 'fp-b', missingCount: 0, removedAt: null },
        { externalId: 'z', fingerprint: 'fp-z', missingCount: 0, removedAt: '2026-09-01T00:00:00Z' },
    ];

    it('집합 비교 — 순서와 무관하게 신규·수정·누락을 가른다', () => {
        const diff = computeDiff(existing, [item('c'), item('b', 'fp-b2'), item('a')]);
        expect(diff.added.map((i) => i.externalId)).toEqual(['c']);
        expect(diff.changed.map((i) => i.externalId)).toEqual(['b']);
        expect(diff.missing).toEqual([]);
    });

    it('안 보이는 기존 건은 missing (삭제 확정 행은 제외)', () => {
        const diff = computeDiff(existing, [item('a')]);
        expect(diff.missing.map((m) => m.externalId)).toEqual(['b']);
    });

    it('삭제 확정됐던 건이 다시 보이면 신규로 취급', () => {
        const diff = computeDiff(existing, [item('a'), item('b'), item('z')]);
        expect(diff.added.map((i) => i.externalId)).toEqual(['z']);
    });
});

describe('watch/engine runSource', () => {
    it('최초 실행은 baseline — 저장만 하고 신규 알림 대상은 비어 있다', async () => {
        const store = memoryStore();
        const r = await runSource(source([item('a'), item('b')]), store);
        expect(r.status).toBe('baseline');
        expect(r.count).toBe(2);
        expect(r.added).toEqual([]);
        expect(store.items.size).toBe(2);
        expect(store.state()?.baselineAt).toBeTruthy();
        expect(store.state()?.lastCount).toBe(2);
    });

    it('두 번째 실행부터 신규·수정을 보고하고 상태를 갱신한다', async () => {
        const store = memoryStore({
            state: { lastCount: 2, consecutiveFailures: 0, baselineAt: 'x' },
            items: [
                { externalId: 'a', fingerprint: 'fp-a', missingCount: 0, removedAt: null },
                { externalId: 'b', fingerprint: 'fp-b', missingCount: 0, removedAt: null },
            ],
        });
        const r = await runSource(source([item('a'), item('b', 'fp-b2'), item('c')]), store);
        expect(r.status).toBe('ok');
        expect(r.added.map((i) => i.externalId)).toEqual(['c']);
        expect(r.changed.map((i) => i.externalId)).toEqual(['b']);
        expect(r.removed).toEqual([]);
        expect(store.calls).toContain('upsert:3:changed=1');
        expect(store.state()?.lastCount).toBe(3);
        expect(store.state()?.consecutiveFailures).toBe(0);
    });

    it(`누락은 ${MISSING_THRESHOLD}회 연속일 때만 삭제 확정`, async () => {
        const mk = (missingCount: number) =>
            memoryStore({
                state: { lastCount: 3, consecutiveFailures: 0, baselineAt: 'x' },
                items: [
                    { externalId: 'a', fingerprint: 'fp-a', missingCount: 0, removedAt: null },
                    { externalId: 'b', fingerprint: 'fp-b', missingCount, removedAt: null },
                    { externalId: 'c', fingerprint: 'fp-c', missingCount: 0, removedAt: null },
                ],
            });
        // 3건 중 2건 응답 — 급감(절반 미만) 아님
        const first = mk(0);
        const r1 = await runSource(source([item('a'), item('c')]), first);
        expect(r1.removed).toEqual([]);
        expect(first.items.get('b')?.missingCount).toBe(1);
        expect(first.items.get('b')?.removedAt).toBeNull();

        const second = mk(1);
        const r2 = await runSource(source([item('a'), item('c')]), second);
        expect(r2.removed).toEqual(['b']);
        expect(second.items.get('b')?.removedAt).toBeTruthy();
    });

    it('수집 실패는 throw 하지 않고 error + 연속 실패 증가', async () => {
        const store = memoryStore({ state: { lastCount: 10, consecutiveFailures: 2, baselineAt: 'x' } });
        const r = await runSource(source(new Error('HTTP 503')), store);
        expect(r.status).toBe('error');
        expect(r.consecutiveFailures).toBe(3);
        expect(r.error).toContain('503');
        expect(store.state()?.consecutiveFailures).toBe(3);
        expect(store.calls).not.toContain(expect.stringMatching(/^upsert/));
    });

    it('급감은 diff 를 돌리지 않는다 — 기존 건이 삭제로 오판되지 않는다', async () => {
        const store = memoryStore({
            state: { lastCount: 100, consecutiveFailures: 0, baselineAt: 'x' },
            items: Array.from({ length: 100 }, (_, i) => ({
                externalId: String(i),
                fingerprint: `fp-${i}`,
                missingCount: 0,
                removedAt: null,
            })),
        });
        const r = await runSource(source([item('0'), item('1')]), store);
        expect(r.status).toBe('suspicious');
        expect(r.consecutiveFailures).toBe(1);
        expect(store.calls.some((c) => c.startsWith('missing'))).toBe(false);
        expect(store.items.get('50')?.missingCount).toBe(0);
    });

    it('persist:false(dry) 는 스토어에 아무것도 쓰지 않는다', async () => {
        const store = memoryStore({
            state: { lastCount: 1, consecutiveFailures: 0, baselineAt: 'x' },
            items: [{ externalId: 'a', fingerprint: 'fp-a', missingCount: 0, removedAt: null }],
        });
        const r = await runSource(source([item('a'), item('b')]), store, { persist: false });
        expect(r.added.map((i) => i.externalId)).toEqual(['b']);
        expect(store.calls).toEqual([]);
    });
});

describe('watch/engine runSource — 스토어 오류', () => {
    it('테이블 미생성 등 스토어 예외도 throw 하지 않고 error + 즉시 경고 수준', async () => {
        const broken = {
            loadSourceState: async () => {
                throw new Error('relation "watch_sources" does not exist');
            },
        } as unknown as WatchStore;
        const r = await runSource(source([item('a')]), broken);
        expect(r.status).toBe('error');
        expect(r.error).toContain('watch_sources');
        expect(r.consecutiveFailures).toBeGreaterThanOrEqual(3);
    });
});

describe('watch/engine runSource — window 소스(최신 N건 게시판)', () => {
    const windowSource = (items: WatchItem[]): WatchSource => ({ ...source(items), mode: 'window' });

    it('창 밖으로 밀려난 옛 글은 누락·삭제로 판정하지 않는다', async () => {
        const store = memoryStore({
            state: { lastCount: 3, consecutiveFailures: 0, baselineAt: 'x' },
            items: [
                { externalId: '1', fingerprint: 'fp-1', missingCount: 0, removedAt: null },
                { externalId: '2', fingerprint: 'fp-2', missingCount: 0, removedAt: null },
                { externalId: '3', fingerprint: 'fp-3', missingCount: 0, removedAt: null },
            ],
        });
        // 새 글 4 가 들어오며 1 이 창 밖으로
        const r = await runSource(windowSource([item('4'), item('3'), item('2')]), store);
        expect(r.status).toBe('ok');
        expect(r.added.map((i) => i.externalId)).toEqual(['4']);
        expect(r.removed).toEqual([]);
        expect(store.calls.some((c) => c.startsWith('missing'))).toBe(false);
        expect(store.items.get('1')?.missingCount).toBe(0);
    });

    it('창 크기가 고정이라 급감 판정은 0건일 때만', async () => {
        const store = memoryStore({
            state: { lastCount: 20, consecutiveFailures: 0, baselineAt: 'x' },
            items: [{ externalId: '1', fingerprint: 'fp-1', missingCount: 0, removedAt: null }],
        });
        const ok = await runSource(windowSource([item('1'), item('2')]), store);
        expect(ok.status).toBe('ok');
        const empty = await runSource(windowSource([]), store);
        expect(empty.status).toBe('suspicious');
    });
});
