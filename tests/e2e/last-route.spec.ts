import { test, expect } from '@playwright/test';

/**
 * 마지막 방문 경로 복원 E2E
 * 명세: .spec/tests/e2e/last-route.spec.md
 *
 * 홈(/) 첫 진입 시 localStorage의 last_route가 있으면 해당 경로로 리다이렉트되는지 검증.
 */

test.describe('마지막 경로 복원', () => {
    test('홈(/) 첫 진입 시 localStorage에 저장된 경로로 리다이렉트된다', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.evaluate(() => {
            localStorage.setItem('last_route', JSON.stringify({ path: '/login' }));
        });

        await page.goto('/');
        await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
        await expect(page).toHaveURL(/\/login/);
    });
});
