import { test, expect } from '@playwright/test';

/**
 * View Transitions 재방문 E2E 테스트
 *
 * Astro View Transitions 사용 시, 다른 페이지로 이동했다가 돌아왔을 때
 * 페이지 콘텐츠가 정상적으로 렌더링되는지 검증합니다.
 *
 * 배경:
 * - View Transitions는 DOM을 교체하지만 <script>를 재실행하지 않음
 * - `astro:page-load` 이벤트 리스너가 없으면 재방문 시 초기화 코드가 실행 안 됨
 * - 증상: 재방문 시 "로딩 중..." 상태로 고정
 *
 * 검증 대상:
 * - 비인증 공개 페이지 간 전환 (/, /login)
 * - publicPaths = ['/', '/login'] — 다른 페이지는 로그인 필요
 */

test.describe('View Transitions — 페이지 재방문 렌더링', () => {
    test('홈(/) → 로그인 → 홈 재방문 시 콘텐츠 유지', async ({ page }) => {
        // 1. 홈 방문 (홈은 h3 카드 구조)
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h3').first()).toBeVisible();
        await expect(page.locator('body')).not.toContainText('로딩 중...');

        // 2. /login 으로 이동 (View Transitions 링크 클릭)
        const loginLink = page.locator('a[href="/login"]');
        await expect(loginLink.first()).toBeVisible();
        await loginLink.first().click();
        await page.waitForURL('**/login');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#emailLoginForm')).toBeVisible();

        // 3. 홈으로 다시 이동 (사이드바/로고 링크)
        const homeLink = page.locator('a[href="/"]');
        await expect(homeLink.first()).toBeVisible();
        await homeLink.first().click();
        await page.waitForURL(/\/$/);
        await page.waitForLoadState('networkidle');

        // 재방문 후에도 콘텐츠가 보여야 함
        await expect(page.locator('h3').first()).toBeVisible();
        await expect(page.locator('body')).not.toContainText('로딩 중...');
    });

    test('로그인 → 홈 → 로그인 재방문 시 폼 유지', async ({ page }) => {
        // 1. 로그인 페이지 방문
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#emailLoginForm')).toBeVisible();
        await expect(page.locator('#emailInput')).toBeVisible();

        // 2. 홈으로 이동 (로고 링크는 .logo-area에 덮여 있으므로 force 클릭)
        const homeLink = page.locator('a[href="/"]').first();
        await homeLink.click({ force: true });
        await page.waitForURL(/\/$/);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h3').first()).toBeVisible();

        // 3. 로그인 페이지로 돌아가기
        const loginLink = page.locator('a[href="/login"]');
        await expect(loginLink.first()).toBeVisible();
        await loginLink.first().click();
        await page.waitForURL('**/login');
        await page.waitForLoadState('networkidle');

        // 재방문 후에도 폼이 다시 렌더링되어야 함
        await expect(page.locator('#emailLoginForm')).toBeVisible();
        await expect(page.locator('#emailInput')).toBeVisible();
        await expect(page.locator('.email-btn')).toBeVisible();
        await expect(page.locator('body')).not.toContainText('로딩 중...');
    });

    test('홈 ↔ 로그인 연속 3회 전환 후에도 콘텐츠 정상 표시', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        for (let i = 0; i < 3; i++) {
            // 로그인으로 이동
            const loginLink = page.locator('a[href="/login"]');
            await expect(loginLink.first()).toBeVisible();
            await loginLink.first().click();
            await page.waitForURL('**/login');
            await page.waitForLoadState('networkidle');
            await expect(page.locator('#emailLoginForm')).toBeVisible();

            // 홈으로 복귀
            const homeLink = page.locator('a[href="/"]');
            await expect(homeLink.first()).toBeVisible();
            await homeLink.first().click();
            await page.waitForURL(/\/$/);
            await page.waitForLoadState('networkidle');
            await expect(page.locator('h3').first()).toBeVisible();
            await expect(page.locator('body')).not.toContainText('로딩 중...');
        }
    });

    test('페이지 전환 후 사이드바/네비게이션 요소 유지', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 사이드바/네비게이션 링크들이 존재해야 함
        const navLinks = page.locator('nav a, aside a');
        const initialCount = await navLinks.count();
        expect(initialCount).toBeGreaterThan(0);

        // 로그인 → 홈 전환
        const loginLink = page.locator('a[href="/login"]');
        await loginLink.first().click();
        await page.waitForURL('**/login');
        await page.waitForLoadState('networkidle');

        const homeLink = page.locator('a[href="/"]');
        await homeLink.first().click();
        await page.waitForURL(/\/$/);
        await page.waitForLoadState('networkidle');

        // 전환 후에도 네비게이션 요소가 동일하게 유지되어야 함
        const afterCount = await page.locator('nav a, aside a').count();
        expect(afterCount).toBe(initialCount);
    });
});
