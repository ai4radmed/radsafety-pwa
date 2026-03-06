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
