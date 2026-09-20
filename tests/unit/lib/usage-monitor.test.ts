import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isMonitorRequest, MONITOR_HEADER } from '../../../src/lib/usage/monitor';

const req = (headers: Record<string, string>) => new Request('https://radsafety.kr/', { headers });
const CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

describe('usage/monitor — 사람이 아닌 요청', () => {
    it('실제 브라우저는 사람으로 본다', () => {
        expect(isMonitorRequest(req({ 'user-agent': CHROME }))).toBe(false);
        expect(isMonitorRequest(req({ 'user-agent': IOS }))).toBe(false);
    });

    it('우리 무인 점검은 헤더로 스스로 밝힌다 — 브라우저 식별 문자열이 진짜여도 빠진다', () => {
        expect(isMonitorRequest(req({ 'user-agent': CHROME, [MONITOR_HEADER]: 'playwright' }))).toBe(true);
    });

    it('헤드리스 브라우저·크롤러·명령줄 도구는 거른다', () => {
        for (const ua of [
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36',
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            'curl/8.5.0',
            'node',
            'undici',
            'vercel-screenshot/1.0',
        ]) {
            expect(isMonitorRequest(req({ 'user-agent': ua })), ua).toBe(true);
        }
    });

    it('식별 문자열이 없으면 브라우저가 아니다', () => {
        expect(isMonitorRequest(req({}))).toBe(true);
    });
});

describe('무인 점검이 헤더를 붙이는지 (소스 계약)', () => {
    const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');

    it('check-production 과 Playwright 가 헤더를 보낸다', () => {
        expect(read('scripts/check-production.mjs')).toMatch(/'x-radsafety-monitor'/);
        expect(read('playwright.config.ts')).toMatch(/extraHTTPHeaders: \{ 'x-radsafety-monitor'/);
    });

    it('미들웨어와 수집구가 같은 판정을 쓴다', () => {
        expect(read('src/middleware.ts')).toMatch(/!isMonitorRequest\(request\)/);
        expect(read('src/pages/api/track.ts')).toMatch(/if \(isMonitorRequest\(request\)\) return/);
    });
});
