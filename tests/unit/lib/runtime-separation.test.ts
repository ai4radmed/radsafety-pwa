import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 브라우저/서버 클라이언트 분리 검증
 *
 * supabase-browser.ts가 supabase-server를 import하면
 * Multiple GoTrueClient instances 경고 발생 (codebase_guide.md)
 */

const BROWSER_CLIENT_PATH = path.resolve('src/lib/supabase-browser.ts');

describe('supabase-browser 런타임 분리', () => {
    it('supabase-server를 import하지 않아야 한다', () => {
        const content = fs.readFileSync(BROWSER_CLIENT_PATH, 'utf-8');
        const importsServer = /from\s+['"].*supabase-server['"]/.test(content);
        expect(importsServer, 'supabase-browser.ts는 supabase-server를 import하면 안 됨').toBe(false);
    });

    it('createBrowserClient를 사용한다', () => {
        const content = fs.readFileSync(BROWSER_CLIENT_PATH, 'utf-8');
        expect(content).toContain('createBrowserClient');
    });
});
