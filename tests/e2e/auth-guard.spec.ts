import { test, expect } from '@playwright/test';

/**
 * 인증 가드 E2E 테스트
 *
 * DashboardLayout의 클라이언트 스크립트가 비로그인 상태에서
 * 보호된 페이지 접근 시 /login 으로 리다이렉트하는지 검증합니다.
 *
 * publicPaths = ['/', '/login'] — 나머지는 모두 보호된 페이지입니다.
 */

const PROTECTED_PAGES = [
    '/mypage',
    '/notifications',
    '/settings',
    '/feedback',
    '/my-feedback',
    '/findings-recommendations',
    '/resources',
    '/guide',
    '/inspection-prep',
];

// /admin/settings는 비로그인 시 /login이 아닌 / (홈)으로 리다이렉트 (자체 가드 로직)
// → 별도 테스트로 분리
const ADMIN_PAGES = [
    '/admin/members',
    '/admin/feedback',
    '/admin/glossary',
    '/admin/verification-requests',
    '/admin/send-notification',
];

test.describe('인증 가드 — 비로그인 리다이렉트', () => {
    test.beforeEach(async ({ page }) => {
        // localStorage / sessionStorage 완전 초기화 (mock 로그인 상태 없음 보장)
        await page.addInitScript(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    for (const path of PROTECTED_PAGES) {
        test(`비로그인 상태에서 ${path} 접근 → /login 리다이렉트`, async ({ page }) => {
            await page.goto(path);
            // 클라이언트 JS가 실행되어 리다이렉트될 때까지 대기
            await page.waitForURL('**/login', { timeout: 5000 });
            expect(page.url()).toContain('/login');
        });
    }

    for (const path of ADMIN_PAGES) {
        test(`비로그인 상태에서 ${path} 접근 → /login 리다이렉트`, async ({ page }) => {
            await page.goto(path);
            await page.waitForURL('**/login', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        });
    }

    test('비로그인 상태에서 /admin/settings 접근 → / (홈) 리다이렉트', async ({ page }) => {
        // /admin/settings는 자체 가드 로직으로 /login 대신 / (홈)으로 리다이렉트
        await page.goto('/admin/settings');
        await page.waitForURL(/\/$/, { timeout: 10000 });
        expect(page.url()).not.toContain('/admin');
    });

    test('비로그인 상태에서 / (홈) 접근 → 리다이렉트 없음', async ({ page }) => {
        await page.goto('/');
        // 홈은 publicPath이므로 리다이렉트 없이 200으로 머물러야 함
        await page.waitForLoadState('networkidle');
        expect(page.url()).not.toContain('/login');
    });

    test('비로그인 상태에서 /login 접근 → 리다이렉트 없음', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/login');
        // /mypage 등으로 튀지 않아야 함
        expect(page.url()).not.toContain('/mypage');
    });
});
