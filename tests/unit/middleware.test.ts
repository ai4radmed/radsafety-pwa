import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 미들웨어 구조 검증 (정적 분석)
 *
 * astro:middleware는 Vitest에서 resolve 불가하므로,
 * 소스 코드에 필수 패턴이 포함되는지 검증합니다.
 */

const MIDDLEWARE_PATH = path.resolve('src/middleware.ts');

describe('middleware 구조 검증', () => {
    it('createSupabaseServerClient를 import하고 호출한다', () => {
        const content = fs.readFileSync(MIDDLEWARE_PATH, 'utf-8');
        expect(content).toContain("from './lib/supabase-server'");
        expect(content).toContain('createSupabaseServerClient');
        expect(content).toContain('createSupabaseServerClient(request, cookies)');
    });

    it('getSession을 호출하고 session을 추출한다', () => {
        const content = fs.readFileSync(MIDDLEWARE_PATH, 'utf-8');
        expect(content).toContain('getSession');
        expect(content).toMatch(/session\s*[}=]/);
    });

    it('locals.supabase, locals.session을 설정한다', () => {
        const content = fs.readFileSync(MIDDLEWARE_PATH, 'utf-8');
        expect(content).toContain('locals.supabase');
        expect(content).toContain('locals.session');
    });

    it('next()를 호출하여 반환한다', () => {
        const content = fs.readFileSync(MIDDLEWARE_PATH, 'utf-8');
        expect(content).toContain('next()');
        expect(content).toMatch(/return\s+next\(\)/);
    });
});

describe('사용성 집계 (U 트랙)', () => {
    const content = () => fs.readFileSync(MIDDLEWARE_PATH, 'utf-8');

    it('GET 요청의 페이지 조회만 기록한다', () => {
        expect(content()).toMatch(/request\.method\s*===\s*'GET'/);
        expect(content()).toMatch(/recordUsage\(/);
    });

    it('제외 판정은 events 모듈에 맡긴다 — 미들웨어가 목록을 따로 들지 않는다', () => {
        expect(content()).toMatch(/isTrackablePath/);
        expect(content()).not.toMatch(/\/proposals'/);
    });

    it('비로그인이 회원 전용 화면을 열면 조회가 아니라 gate_blocked 로 센다', () => {
        const c = content();
        expect(c).toMatch(/isPublicPath/);
        expect(c).toMatch(/gate_blocked/);
        // 벽일 때 page_view 를 같이 쓰지 않는다(이중 집계 방지) — 삼항으로 하나만 고른다
        expect(c).toMatch(/blocked\s*\?\s*'gate_blocked'\s*:\s*'page_view'/);
    });
});
