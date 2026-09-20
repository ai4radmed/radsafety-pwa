import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * /api/cron/watch — 인증·부작용 경계와 vercel.json 스케줄이 명세(.spec/src/pages/api/cron/watch.md)와
 * 일치하는지 정적으로 검증한다. 엔진·알림 로직은 tests/unit/lib/watch/* 가 맡는다.
 */
const ROUTE = fs.readFileSync(path.resolve('src/pages/api/cron/watch.ts'), 'utf-8');
const VERCEL = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf-8'));

describe('/api/cron/watch', () => {
    it('SSR 라우트이며 Bearer CRON_SECRET 을 상수시간 비교한다', () => {
        expect(ROUTE).toContain('export const prerender = false');
        expect(ROUTE).toMatch(/CRON_SECRET/);
        expect(ROUTE).toMatch(/Bearer /);
        expect(ROUTE).toMatch(/timingSafeEqual\(/);
        // 비밀 미설정이면 토큰 경로는 닫힌다(빈 문자열 일치 금지)
        expect(ROUTE).toMatch(/if \(!CRON_SECRET\) return false/);
    });

    it('토큰이 아니면 admin 쿠키(profiles.is_admin)로만 허용', () => {
        expect(ROUTE).toMatch(/from\('profiles'\)/);
        expect(ROUTE).toMatch(/select\('is_admin'\)/);
        expect(ROUTE).toMatch(/profile\?\.is_admin/);
    });

    it('dry=1 이면 저장·알림 없이 diff 만', () => {
        expect(ROUTE).toMatch(/searchParams\.get\('dry'\) === '1'/);
        expect(ROUTE).toMatch(/persist: !dry/);
        expect(ROUTE).toMatch(/dry \? \{ memberNotified: 0, telegram: false \}/);
    });

    it('응답은 no-store 이고 비밀값을 되돌리지 않는다', () => {
        expect(ROUTE).toContain("'Cache-Control': 'no-store'");
        expect(ROUTE).not.toMatch(/CRON_SECRET[^\n]*jsonResponse/);
    });
});

describe('vercel.json crons', () => {
    it('감시 cron 하나가 하루 1회(Hobby 한도)로 등록돼 있다', () => {
        const crons = VERCEL.crons as { path: string; schedule: string }[];
        const watch = crons.find((c) => c.path === '/api/cron/watch');
        expect(watch).toBeDefined();
        // 분·시가 고정값이고 일/월/요일이 * 이면 하루 1회
        expect(watch!.schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
    });
});
