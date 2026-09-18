import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * /api/health deep 게이트가 profiles.is_admin 단일 기준을 쓰는지 검증(2026-09-16).
 * 회귀 배경: username 로그인 사용자는 auth.users.email 이 <username>@radsafety.invalid
 * 가짜 값이라, 이메일 대조(구 isAdmin())로는 전환한 관리자가 403을 받는 문제가 있었다.
 */
const ROUTE_PATH = path.resolve('src/pages/api/health.ts');

describe('/api/health deep 게이트', () => {
    it('isAdmin(이메일 대조)을 더 이상 쓰지 않는다', () => {
        const content = fs.readFileSync(ROUTE_PATH, 'utf-8');
        expect(content).not.toContain('import { isAdmin }');
        expect(content).not.toMatch(/isAdmin\(/);
    });

    it('profiles.is_admin 을 조회해 관리자 여부를 판정한다', () => {
        const content = fs.readFileSync(ROUTE_PATH, 'utf-8');
        expect(content).toMatch(/from\('profiles'\)/);
        expect(content).toMatch(/select\('is_admin'\)/);
        expect(content).toMatch(/profile\?\.is_admin/);
    });
});
