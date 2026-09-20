import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../../src/lib/supabase-server', () => ({ supabaseAdmin: null }));

import {
    ROLLUP_WINDOW_DAYS,
    aggregateActive,
    aggregateDaily,
    aggregatePageDaily,
    runUsageRollup,
    type RawUsageRow,
} from '../../../src/lib/usage/rollup';

const row = (over: Partial<RawUsageRow>): RawUsageRow => ({
    event: 'page_view',
    hour: '2026-09-21T03:00:00Z',
    page: '/kins',
    actor_key: null,
    week_key: null,
    month_key: null,
    ...over,
});

describe('rollup 일자·이벤트 집계', () => {
    it('횟수는 모두 세고, 활성자는 로그인 회원만 센다', () => {
        const out = aggregateDaily([
            row({ actor_key: 'a' }),
            row({ actor_key: 'a' }), // 같은 사람 두 번 = 1명
            row({ actor_key: 'b' }),
            row({ actor_key: null }), // 비로그인 — 횟수에만
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].count).toBe(4);
        expect(out[0].unique_actors).toBe(2);
    });

    it('한국 시간 기준으로 날짜를 가른다 — UTC 로 전날이어도', () => {
        const out = aggregateDaily([
            row({ hour: '2026-09-20T14:00:00Z' }), // KST 09-20 23시
            row({ hour: '2026-09-20T16:00:00Z' }), // KST 09-21 01시
        ]);
        expect(out.map((d) => d.day)).toEqual(['2026-09-20', '2026-09-21']);
    });

    it('이벤트가 다르면 따로 센다', () => {
        const out = aggregateDaily([row({ event: 'page_view' }), row({ event: 'gate_blocked' })]);
        expect(out.map((d) => d.event).sort()).toEqual(['gate_blocked', 'page_view']);
    });
});

describe('rollup 화면별 집계', () => {
    it('경로가 없는 행은 건너뛴다 — 가입·로그인은 화면 순위에 들어가지 않는다', () => {
        const out = aggregatePageDaily([row({ page: null, event: 'signup' }), row({ page: '/kins' })]);
        expect(out).toHaveLength(1);
        expect(out[0].page).toBe('/kins');
    });

    it('같은 날 같은 화면의 조회와 벽은 따로 센다', () => {
        const out = aggregatePageDaily([
            row({ page: '/bulletins', event: 'page_view' }),
            row({ page: '/bulletins', event: 'gate_blocked' }),
            row({ page: '/bulletins', event: 'gate_blocked' }),
        ]);
        const blocked = out.find((o) => o.event === 'gate_blocked')!;
        expect(blocked.count).toBe(2);
        expect(out.find((o) => o.event === 'page_view')!.count).toBe(1);
    });
});

describe('rollup 활성 사용자', () => {
    it('기간마다 그 기간의 키로 센다 — 일일 키로는 주간을 셀 수 없다', () => {
        const out = aggregateActive([
            row({ actor_key: 'd1', week_key: 'w1', month_key: 'm1', hour: '2026-09-21T03:00:00Z' }),
            row({ actor_key: 'd2', week_key: 'w1', month_key: 'm1', hour: '2026-09-22T03:00:00Z' }),
        ]);
        // 날짜가 다르므로 일일은 하루 1명씩, 주·월은 같은 사람이라 1명
        expect(out.filter((o) => o.period === 'day').map((o) => o.unique_actors)).toEqual([1, 1]);
        expect(out.find((o) => o.period === 'week')!.unique_actors).toBe(1);
        expect(out.find((o) => o.period === 'month')!.unique_actors).toBe(1);
    });

    it('비로그인은 활성자에 들어가지 않는다 — 서로 구분할 수단이 없다', () => {
        const out = aggregateActive([row({ actor_key: null, week_key: null, month_key: null })]);
        expect(out).toHaveLength(0);
    });
});

describe('rollup 활성 사용자 — 기간 커버리지 가드', () => {
    it('기간 시작이 읽어 온 범위보다 앞서면 그 기간은 건너뛴다 — 부분 계산으로 덮어쓰지 않는다', () => {
        // 09-23(수)은 주 중간이다. 그날부터만 읽었다면 그 주와 9월 전체는 부분만 보인다.
        const rows = [row({ actor_key: 'a', week_key: 'w', month_key: 'm', hour: '2026-09-23T03:00:00Z' })];
        const guarded = aggregateActive(rows, { minPeriodStart: new Date('2026-09-22T15:00:00Z') });
        // 일(09-21)만 남고 주·월은 시작이 더 앞이라 빠진다
        expect(guarded.map((g) => g.period)).toEqual(['day']);

        // 가드가 없으면 전부 계산된다(8일 창만 읽고 월간을 덮어쓰던 옛 동작)
        const unguarded = aggregateActive(rows);
        expect(unguarded.map((g) => g.period).sort()).toEqual(['day', 'month', 'week']);
    });
});

describe('rollup 실행', () => {
    it('서비스 롤 클라이언트가 없으면 던지지 않고 오류를 담아 돌려준다', async () => {
        const r = await runUsageRollup({ now: new Date('2026-09-21T18:40:00Z') });
        expect(r.error).toBeTruthy();
        expect(r.windowDays).toBe(ROLLUP_WINDOW_DAYS);
    });

    it('다시 계산하는 창이 오프라인 큐 상한(7일)보다 넓다', () => {
        expect(ROLLUP_WINDOW_DAYS).toBeGreaterThan(7);
    });
});

describe('rollup 계약 (소스)', () => {
    const SRC = fs.readFileSync(path.resolve('src/lib/usage/rollup.ts'), 'utf-8');
    const CRON = fs.readFileSync(path.resolve('src/pages/api/cron/usage-rollup.ts'), 'utf-8');
    const VERCEL = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf-8'));

    it('여러 번 돌려도 같은 결과가 된다', () => {
        // 일자·화면은 지우고 다시 넣고, 활성자는 덮어쓴다
        expect(SRC).toMatch(/insert\(daily\)/);
        expect(SRC).toMatch(/insert\(pageDaily\)/);
        expect(SRC).toMatch(/onConflict: 'period,period_key'/);
    });

    it('창 안의 집계는 지우고 다시 넣는다 — 원시에서 사라진 조합의 낡은 합계가 남지 않게', () => {
        expect(SRC).toMatch(/from\('usage_daily'\)\.delete\(\)\.gte\('day', sinceDayKey\)/);
        expect(SRC).toMatch(/from\('usage_page_daily'\)\.delete\(\)\.gte\('day', sinceDayKey\)/);
    });

    it('활성자는 이번 주·이번 달 시작까지 거슬러 읽는다 — 8일치로 한 달치를 덮어쓰지 않게', () => {
        expect(SRC).toMatch(/kstWeekStart\(now\)/);
        expect(SRC).toMatch(/kstMonthStart\(now\)/);
        expect(SRC).toMatch(/minPeriodStart/);
    });

    it('보존 기간이 지난 원시 행을 지운다', () => {
        expect(SRC).toMatch(/USAGE_RETENTION_DAYS/);
        expect(SRC).toMatch(/\.delete\(\)/);
    });

    it('dry 면 쓰지 않는다', () => {
        expect(SRC).toMatch(/if \(!dry\)/);
    });

    it('크론은 감시와 같은 비밀을 쓰되 경로가 따로다', () => {
        expect(CRON).toMatch(/CRON_SECRET/);
        expect(CRON).toMatch(/timingSafeEqual/);
        const paths = VERCEL.crons.map((c: { path: string }) => c.path);
        expect(paths).toContain('/api/cron/usage-rollup');
        expect(paths).toContain('/api/cron/watch');
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('롤업은 한국 시간 자정 이후에 돈다 — 전날이 끝난 뒤 집계해야 한다', () => {
        const job = VERCEL.crons.find((c: { path: string }) => c.path === '/api/cron/usage-rollup');
        const [minute, hourUtc] = job.schedule.split(' ');
        const kstHour = (Number(hourUtc) + 9) % 24;
        expect(Number.isFinite(Number(minute))).toBe(true);
        expect(kstHour).toBeGreaterThanOrEqual(1);
        expect(kstHour).toBeLessThan(6);
    });
});

describe('관리자 사용 현황 화면 (소스 계약)', () => {
    const API = fs.readFileSync(path.resolve('src/pages/api/admin/usage.ts'), 'utf-8');
    const PAGE = fs.readFileSync(path.resolve('src/pages/admin/usage.astro'), 'utf-8');

    it('관리자만 읽을 수 있다', () => {
        expect(API).toMatch(/is_admin/);
        expect(API).toMatch(/403/);
        expect(API).toMatch(/401/);
    });

    it('원시 이벤트는 내주지 않는다 — 집계본만', () => {
        expect(API).not.toMatch(/from\('usage_events'\)/);
        expect(API).toMatch(/from\('usage_daily'\)/);
        expect(API).toMatch(/from\('usage_page_daily'\)/);
        expect(API).toMatch(/from\('usage_active'\)/);
    });

    it('가리기 설정을 화면이 따른다', () => {
        expect(PAGE).toMatch(/USAGE_MIN_DISPLAY_COUNT/);
        expect(PAGE).toMatch(/minDisplay > 0/);
    });

    it('활성자는 합산하지 않는다 — 날짜를 넘어 같은 사람을 이을 수 없다', () => {
        expect(PAGE).toMatch(/Math\.max\(cur\.actors, r\.unique_actors\)/);
        expect(PAGE).toMatch(/합산하지 않습니다/);
    });
});
