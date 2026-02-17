import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * prerender = false 누락 검증
 *
 * 서버 사이드 API(request, cookies 등)를 사용하는 페이지에
 * `export const prerender = false`가 없으면,
 * Astro 빌드 시 정적 HTML로 프리렌더링되어 프로덕션에서 장애가 발생합니다.
 *
 * 실제 사례: /auth/callback, /auth/confirm이 프리렌더링되어
 * Content-Type: application/octet-stream → 브라우저가 다운로드 (2026-02-16)
 */

const PAGES_DIR = path.resolve('src/pages');

/** 서버 사이드 실행이 필수인 파일 패턴 */
const SERVER_PATTERNS = [/createSupabaseServerClient/, /Astro\.request\.headers/, /Astro\.cookies/];

function findFiles(dir: string, extensions: string[]): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findFiles(fullPath, extensions));
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(fullPath);
        }
    }
    return results;
}

describe('prerender = false 검증', () => {
    it('서버 API를 사용하는 페이지에 prerender = false가 있어야 한다', () => {
        const files = findFiles(PAGES_DIR, ['.ts', '.astro']);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const usesServerAPI = SERVER_PATTERNS.some((pattern) => pattern.test(content));

            if (usesServerAPI) {
                const hasPrerender = /export\s+const\s+prerender\s*=\s*false/.test(content);
                if (!hasPrerender) {
                    const relPath = path.relative(process.cwd(), file);
                    violations.push(relPath);
                }
            }
        }

        expect(violations, `prerender = false 누락 파일:\n${violations.join('\n')}`).toEqual([]);
    });

    it('API route (pages/api/) 파일에 prerender = false가 있어야 한다', () => {
        const apiDir = path.join(PAGES_DIR, 'api');
        if (!fs.existsSync(apiDir)) return;

        const files = findFiles(apiDir, ['.ts']);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const hasPrerender = /export\s+const\s+prerender\s*=\s*false/.test(content);
            if (!hasPrerender) {
                const relPath = path.relative(process.cwd(), file);
                violations.push(relPath);
            }
        }

        expect(violations, `prerender = false 누락 API route:\n${violations.join('\n')}`).toEqual([]);
    });

    it('auth route 파일에 prerender = false가 있어야 한다', () => {
        const authDir = path.join(PAGES_DIR, 'auth');
        if (!fs.existsSync(authDir)) return;

        const files = findFiles(authDir, ['.ts']);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const hasPrerender = /export\s+const\s+prerender\s*=\s*false/.test(content);
            if (!hasPrerender) {
                const relPath = path.relative(process.cwd(), file);
                violations.push(relPath);
            }
        }

        expect(violations, `prerender = false 누락 auth route:\n${violations.join('\n')}`).toEqual([]);
    });
});
