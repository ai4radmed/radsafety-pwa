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

        // /login 은 저장 제외 경로라 getLastRoute() 가 무시한다(2026-09-18) — 회원 전용 페이지를
        // 저장해 두면 복원(/notifications) → 비로그인 가드(/login?from=…) 순으로 튕겨, 복원이 실제로
        // 일어났음을 최종 URL 로 판별할 수 있다(복원이 없으면 공개 페이지 / 에 그대로 머문다).
        // (/resources 는 2026-09-19 2계층 공개 계층으로 공개돼 더 이상 튕기지 않는다.)
        await page.evaluate(() => {
            localStorage.setItem('last_route', JSON.stringify({ path: '/notifications' }));
        });

        await page.goto('/');
        await page.waitForURL('**/login**', { timeout: 5000 });
        await expect(page).toHaveURL(/\/login/);
    });
});
