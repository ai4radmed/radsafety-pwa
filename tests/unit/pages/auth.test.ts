import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 인증 라우트 prerender = false 검증
 *
 * /auth/callback, /auth/confirm이 프리렌더링되면
 * Content-Type: application/octet-stream → 브라우저가 다운로드 (test_strategy.md)
 */

const PAGES_DIR = path.resolve('src/pages');

describe('auth 라우트 prerender 검증', () => {
    it('callback.ts에 prerender = false가 있어야 한다', () => {
        const file = path.join(PAGES_DIR, 'auth', 'callback.ts');
        expect(fs.existsSync(file), 'auth/callback.ts 파일이 존재해야 함').toBe(true);

        const content = fs.readFileSync(file, 'utf-8');
        const hasPrerender = /export\s+const\s+prerender\s*=\s*false/.test(content);
        expect(hasPrerender, 'auth/callback.ts에 prerender = false가 있어야 함').toBe(true);
    });

    it('confirm.ts에 prerender = false가 있어야 한다', () => {
        const file = path.join(PAGES_DIR, 'auth', 'confirm.ts');
        expect(fs.existsSync(file), 'auth/confirm.ts 파일이 존재해야 함').toBe(true);

        const content = fs.readFileSync(file, 'utf-8');
        const hasPrerender = /export\s+const\s+prerender\s*=\s*false/.test(content);
        expect(hasPrerender, 'auth/confirm.ts에 prerender = false가 있어야 함').toBe(true);
    });
});
