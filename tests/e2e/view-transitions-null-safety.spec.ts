import { test, expect } from '@playwright/test';

/**
 * View Transitions 재방문 시 console.error 없음 검증
 *
 * 조건부 DOM 요소에 `!` 강제 접근 시, 재방문 시 null → TypeError 발생.
 * 이 테스트는 페이지 전환 중 console.error가 발생하지 않음을 검증합니다.
 *
 * test_strategy.md: "콘솔에 에러가 없어야 하는 페이지들"
 */

test.describe('View Transitions null safety', () => {
    test('비인증 페이지 전환 시 console.error 없음', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
            const type = msg.type();
            if (type === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // 1. 홈 → 로그인
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loginLink = page.locator('a[href="/login"]').first();
        await loginLink.click();
        await page.waitForURL('**/login');
        await page.waitForLoadState('networkidle');

        // 2. 로그인 → 홈 (재방문)
        const homeLink = page.locator('a[aria-label="Home"]');
        await homeLink.click();
        await page.waitForURL(/\/$/);
        await page.waitForLoadState('networkidle');

        // 3. 홈 → 로그인 (재방문)
        await page.locator('a[href="/login"]').first().click();
        await page.waitForURL('**/login');
        await page.waitForLoadState('networkidle');

        expect(consoleErrors, `console.error 발생:\n${consoleErrors.join('\n')}`).toEqual([]);
    });
});
