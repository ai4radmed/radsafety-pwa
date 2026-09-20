import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock('../../../../src/lib/supabase-server', () => ({ supabaseAdmin: {} }));

import {
    bulletinSourceOf,
    planIngest,
    suggestParent,
    toIsoDate,
    SUGGEST_WINDOW_DAYS,
} from '../../../../src/lib/bulletins/ingest';
import type { WatchItem } from '../../../../src/lib/watch/types';

const item = (id: string, relevant: 'Y' | 'N' = 'Y'): WatchItem => ({
    externalId: id,
    title: `사건 ${id}`,
    fingerprint: 'fp',
    detail: { relevant },
});

describe('bulletins/ingest 순수 함수', () => {
    it('bulletinSourceOf — 감시 소스 id 를 bulletins.source 로', () => {
        expect(bulletinSourceOf('nsic-accidents')).toBe('nsic');
        expect(bulletinSourceOf('nssc-press')).toBe('nssc');
        expect(bulletinSourceOf('kins-sos')).toBeNull();
    });

    it('toIsoDate — 점·하이픈 날짜를 ISO 로, 그 외 null', () => {
        expect(toIsoDate('2026.09.18')).toBe('2026-09-18');
        expect(toIsoDate('2026-08-02')).toBe('2026-08-02');
        expect(toIsoDate('')).toBeNull();
        expect(toIsoDate('어제')).toBeNull();
    });

    it('planIngest nsic — 최초 실행은 published 백필, 이후 신규는 pending, 기존 건은 제외', () => {
        const items = [item('A'), item('B', 'N')];
        const first = planIngest('nsic', items, new Set(), { firstRun: true });
        expect(first.map((p) => [p.item.externalId, p.status])).toEqual([
            ['A', 'published'],
            ['B', 'published'],
        ]);
        const later = planIngest('nsic', [item('A'), item('C', 'N')], new Set(['A']), { firstRun: false });
        expect(later.map((p) => [p.item.externalId, p.status])).toEqual([['C', 'pending']]);
    });

    it('planIngest nssc — 관련(relevant) 신규만 pending 으로, 무관은 넣지 않는다', () => {
        const plan = planIngest('nssc', [item('1', 'Y'), item('2', 'N'), item('3', 'Y')], new Set(['3']), {
            firstRun: true,
        });
        expect(plan.map((p) => [p.item.externalId, p.status])).toEqual([['1', 'pending']]);
    });

    it(`suggestParent — ±${SUGGEST_WINDOW_DAYS}일 안의 가장 가까운 속보, 없으면 null`, () => {
        const cands = [
            { id: 'far', occurred_at: '2026-01-01' },
            { id: 'near', occurred_at: '2026-08-10' },
            { id: 'nearer', occurred_at: '2026-08-04' },
            { id: 'nodate', occurred_at: null },
        ];
        expect(suggestParent('2026-08-02', cands)).toBe('nearer');
        expect(suggestParent('2025-01-01', cands)).toBeNull();
        expect(suggestParent(null, cands)).toBeNull();
    });
});
