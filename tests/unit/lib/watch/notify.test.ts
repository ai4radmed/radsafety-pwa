import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const profilesEq = vi.fn();
vi.mock('../../../../src/lib/supabase-server', () => ({
    supabaseAdmin: {
        from: () => ({ select: () => ({ eq: profilesEq }) }),
    },
}));

const createBulkNotifications = vi.fn();
vi.mock('../../../../src/lib/notification-helper', () => ({
    createBulkNotifications: (...args: unknown[]) => createBulkNotifications(...args),
}));

const sendTelegramMessage = vi.fn();
vi.mock('../../../../src/lib/telegram', () => ({
    sendTelegramMessage: (...args: unknown[]) => sendTelegramMessage(...args),
}));

import {
    buildMemberNotification,
    buildAdminSummary,
    notifyWatchResults,
    getWatchReportMode,
} from '../../../../src/lib/watch/notify';
import type { SourceRunResult, WatchItem, WatchSource } from '../../../../src/lib/watch/types';

const source: WatchSource = {
    id: 'kins-sos',
    label: 'KINS 방사선규제해석 SOS',
    guide: 'RASIS 메인 → 알림마당 → 방사선규제해석SOS',
    link: '/kins',
    fetchItems: async () => [],
};

const item = (id: string, title: string, mngNo?: string): WatchItem => ({
    externalId: id,
    title,
    category: '허가/신고',
    fingerprint: 'fp',
    detail: mngNo ? { mngNo } : undefined,
});

const result = (over: Partial<SourceRunResult> = {}): SourceRunResult => ({
    source: 'kins-sos',
    label: source.label,
    status: 'ok',
    count: 159,
    added: [],
    changed: [],
    removed: [],
    consecutiveFailures: 0,
    ...over,
});

beforeEach(() => {
    profilesEq.mockReset().mockResolvedValue({ data: [{ id: 'u1' }, { id: 'u2' }], error: null });
    createBulkNotifications.mockReset().mockResolvedValue([]);
    sendTelegramMessage.mockReset().mockResolvedValue(true);
});

describe('watch/notify buildMemberNotification', () => {
    it('변화 없으면 null', () => {
        expect(buildMemberNotification(source, result())).toBeNull();
        expect(buildMemberNotification(source, result({ removed: ['x'] }))).toBeNull();
    });

    it('신규·수정을 한 건으로 묶고 관리번호·분류·경로를 넣는다', () => {
        const n = buildMemberNotification(
            source,
            result({ added: [item('1', '새 해석', '2.045')], changed: [item('2', '고친 해석')] }),
        )!;
        expect(n.title).toBe('KINS 방사선규제해석 SOS 신규 1건 · 수정 1건');
        expect(n.message).toContain('[2.045] 허가/신고 · 새 해석');
        expect(n.message).toContain('고친 해석');
        expect(n.message).toContain('경로: RASIS 메인');
    });

    it('5건 넘으면 나머지는 "외 N건"', () => {
        const added = Array.from({ length: 8 }, (_, i) => item(String(i), `제목${i}`));
        const n = buildMemberNotification(source, result({ added }))!;
        expect(n.message).toContain('… 외 3건');
        expect(n.message).not.toContain('제목7');
    });
});

describe('watch/notify buildAdminSummary', () => {
    it('changes 모드: 조용한 정상 실행은 null (텔레그램 안 보냄)', () => {
        expect(
            buildAdminSummary([result(), result({ status: 'error', consecutiveFailures: 1, error: 'x' })], 'changes'),
        ).toBeNull();
    });

    it('changes 모드: baseline·변화·3회 연속 실패는 보고', () => {
        const s = buildAdminSummary(
            [
                result({ status: 'baseline', count: 158 }),
                result({ removed: ['9'] }),
                result({ status: 'suspicious', consecutiveFailures: 3, error: '건수 급감: 158 → 2' }),
            ],
            'changes',
        )!;
        expect(s).toContain('baseline 저장 158건');
        expect(s).toContain('삭제 1');
        expect(s).toContain('3회 연속 실패');
        expect(s).toContain('급감');
    });

    it('all 모드: 변화 없어도 하트비트 문안 — 소스별 건수와 1~2회 실패까지 적는다', () => {
        const s = buildAdminSummary(
            [result({ count: 158 }), result({ status: 'error', consecutiveFailures: 1, error: 'HTTP 503' })],
            'all',
        )!;
        expect(s.split('\n')[0]).toBe('[RadSafety] KINS 자원 감시 — 변화 없음');
        expect(s).toContain('변화 없음 (158건)');
        expect(s).toContain('실패 1회째 — HTTP 503');
    });

    it('all 모드: 변화가 있으면 머리말에 "변화 없음"을 붙이지 않는다', () => {
        const s = buildAdminSummary([result({ added: [item('1', '새 해석')] })], 'all')!;
        expect(s.split('\n')[0]).toBe('[RadSafety] KINS 자원 감시');
        expect(s).toContain('신규 1');
    });

    it('기본 모드는 all, WATCH_REPORT=changes 면 changes', () => {
        vi.stubEnv('WATCH_REPORT', '');
        expect(getWatchReportMode()).toBe('all');
        vi.stubEnv('WATCH_REPORT', 'changes');
        expect(getWatchReportMode()).toBe('changes');
        vi.stubEnv('WATCH_REPORT', 'weird');
        expect(getWatchReportMode()).toBe('all');
        vi.unstubAllEnvs();
    });
});

describe('watch/notify notifyWatchResults', () => {
    it('active 회원 전원에게 소스당 1건, 삭제만 있으면 회원 알림 없음', async () => {
        const out = await notifyWatchResults([source], [result({ added: [item('1', '새 해석')], removed: ['7'] })]);
        expect(createBulkNotifications).toHaveBeenCalledTimes(1);
        const [ids, data] = createBulkNotifications.mock.calls[0];
        expect(ids).toEqual(['u1', 'u2']);
        expect(data.type).toBe('system_notice');
        expect(data.link).toBe('/kins');
        expect(out.memberNotified).toBe(2);
        expect(out.telegram).toBe(true);
    });

    it('알림 실패는 삼키고 결과만 낮춘다', async () => {
        createBulkNotifications.mockRejectedValue(new Error('db down'));
        sendTelegramMessage.mockRejectedValue(new Error('HTTP 401'));
        const out = await notifyWatchResults([source], [result({ added: [item('1', 'x')] })]);
        expect(out).toEqual({ memberNotified: 0, telegram: false });
    });
});

describe('watch/notify memberFilter · 직접 주소', () => {
    const filtered: WatchSource = {
        ...source,
        id: 'nssc-press',
        label: '원안위 보도자료',
        memberFilter: (i) => i.detail?.relevant === 'Y',
    };
    const press = (id: string, relevant: 'Y' | 'N'): WatchItem => ({
        externalId: id,
        title: `보도 ${id}`,
        category: '방사선안전과',
        fingerprint: 'fp',
        detail: { relevant, writeDate: '2026.09.18', url: `https://example.org/${id}` },
    });

    it('회원 알림은 필터를 통과한 건만, 전부 걸러지면 null', () => {
        const n = buildMemberNotification(
            filtered,
            result({ source: 'nssc-press', added: [press('1', 'Y'), press('2', 'N')] }),
        )!;
        expect(n.title).toBe('원안위 보도자료 신규 1건');
        expect(n.message).toContain('2026.09.18 · 방사선안전과 · 보도 1');
        expect(n.message).toContain('https://example.org/1');
        expect(n.message).not.toContain('보도 2');
        expect(buildMemberNotification(filtered, result({ added: [press('2', 'N')] }))).toBeNull();
    });

    it('관리자 요약은 전체 신규와 회원 알림 건수를 함께 적는다', () => {
        const s = buildAdminSummary(
            [result({ source: 'nssc-press', label: '원안위 보도자료', added: [press('1', 'Y'), press('2', 'N')] })],
            'changes',
            [filtered],
        )!;
        expect(s).toContain('신규 2 · 수정 0 · 삭제 0 · 회원 알림 1');
    });
});
