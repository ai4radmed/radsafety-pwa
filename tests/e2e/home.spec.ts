import { test, expect } from '@playwright/test';

test.describe('홈페이지', () => {
    test('홈페이지 정상 렌더링', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/RadSafety|방사선/);
    });

    test('네비게이션 링크 존재', async ({ page }) => {
        await page.goto('/');
        // 사이드바 또는 모바일 네비게이션에 주요 링크가 있는지 확인
        const links = await page
            .locator(
                'a[href="/inspection-prep"], a[href="/resources"], a[href="/findings-recommendations"], a[href="/feedback"]',
            )
            .count();
        expect(links).toBeGreaterThan(0);
    });

    test('면책 조치 주의사항 노출 확인', async ({ page }) => {
        await page.goto('/');
        const notice = page.locator('text=주의: 제공되는 자료는 관련규정의 개정이나 규제 당국');
        await expect(notice).toBeVisible();
    });
});
