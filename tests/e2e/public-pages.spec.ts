import { test, expect } from '@playwright/test';

/**
 * 공개 페이지 E2E 테스트
 *
 * 비로그인 상태에서 접근 가능한 페이지들의 렌더링 및 UI 요소를 검증합니다.
 * 수동 체크리스트 3-1, 3-2 항목을 자동화합니다.
 *
 * 참고:
 * publicPaths = ['/', '/login'] — 나머지 페이지는 로그인 필요 (비로그인 시 /login 리다이렉트)
 */

test.describe('공개 페이지 렌더링 (비로그인)', () => {
    test('홈페이지(/) — 타이틀 및 주요 카드 존재', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/RadSafety|방사선/);
        // 홈 페이지는 h3 카드 구조 사용
        await expect(page.locator('h3').first()).toBeVisible();
        // 주요 네비게이션 링크 존재
        const links = page.locator(
            'a[href="/inspection-prep"], a[href="/resources"], a[href="/findings-recommendations"]',
        );
        await expect(links.first()).toBeVisible();
    });

    test('로그인 페이지(/login) — 카카오 버튼 및 이메일 폼 존재', async ({ page }) => {
        await page.goto('/login');
        // 카카오 로그인 버튼
        const kakaoBtn = page.locator('a[href*="kakao"], button:has-text("카카오")');
        await expect(kakaoBtn.first()).toBeVisible();
        // 이메일 입력 폼
        await expect(page.locator('#emailLoginForm')).toBeVisible();
        await expect(page.locator('#emailInput')).toBeVisible();
        await expect(page.locator('.email-btn')).toBeVisible();
    });

    test('/guide — 비로그인 시 /login 리다이렉트 (설계 동작)', async ({ page }) => {
        await page.goto('/guide');
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
    });

    test('/inspection-prep — 비로그인 시 /login 리다이렉트 (설계 동작)', async ({ page }) => {
        await page.goto('/inspection-prep');
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
    });

    test('/resources — 비로그인 시 /login 리다이렉트 (설계 동작)', async ({ page }) => {
        await page.goto('/resources');
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
    });
});

test.describe('로그인 페이지 UI 상세', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('이메일 입력 → 버튼 클릭 가능 상태', async ({ page }) => {
        const input = page.locator('#emailInput');
        const button = page.locator('.email-btn');
        await expect(input).toBeEnabled();
        await expect(button).toBeEnabled();
    });

    test('이메일 미입력 → 폼 제출 차단 (HTML validation)', async ({ page }) => {
        const button = page.locator('.email-btn');
        await button.click();
        // 이메일 미입력 시 브라우저 validation으로 제출 안 됨 → URL 유지
        await page.waitForTimeout(300);
        expect(page.url()).toContain('/login');
    });
});
