import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PUBLIC_PATHS, isPublicPath } from '../../../src/lib/public-paths';

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');

describe('2계층 공개 경로', () => {
    it('비회원이 쓰는 메뉴는 공개', () => {
        for (const p of [
            '/',
            '/login',
            '/inspection-prep',
            '/findings-recommendations',
            '/resources',
            '/guide',
            '/privacy',
            '/kins',
        ]) {
            expect(isPublicPath(p)).toBe(true);
        }
    });

    it('회원 전용 메뉴와 관리자 화면은 비공개', () => {
        for (const p of ['/mypage', '/notifications', '/feedback', '/my-feedback', '/bulletins', '/admin/members']) {
            expect(isPublicPath(p)).toBe(false);
        }
    });

    it('하위 경로도 따라간다', () => {
        expect(isPublicPath('/resources/pet-ct')).toBe(true);
        expect(isPublicPath('/info/pet-ct-dose')).toBe(true);
    });

    it("'/' 는 정확히 일치할 때만 — 접두로 쓰면 전부 공개가 된다", () => {
        expect(isPublicPath('/')).toBe(true);
        expect(isPublicPath('/mypage')).toBe(false);
    });

    it('익명 제안 조회는 공개 — 로그인을 요구하면 조회와 계정이 다시 묶인다', () => {
        expect(isPublicPath('/proposal-lookup')).toBe(true);
        // 제안 작성·내 제안은 회원 전용
        expect(isPublicPath('/proposals')).toBe(false);
        expect(isPublicPath('/my-proposals')).toBe(false);
    });
});

describe('목록은 한 벌만 존재한다 (소스 계약)', () => {
    it('auth-handler 와 미들웨어가 같은 모듈을 쓴다 — 목록을 복제하지 않는다', () => {
        const AUTH = read('src/lib/auth-handler.ts');
        const MW = read('src/middleware.ts');
        expect(AUTH).toMatch(/from '\.\/public-paths'/);
        expect(MW).toMatch(/from '\.\/lib\/public-paths'/);
        // 복제된 배열이 남아 있지 않은지
        expect(AUTH).not.toMatch(/const publicPaths\s*=\s*\[/);
    });

    it('목록이 비어 있지 않다', () => {
        expect(PUBLIC_PATHS.length).toBeGreaterThan(5);
    });
});
