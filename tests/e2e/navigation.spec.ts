import { test, expect } from '@playwright/test';

test.describe('페이지 접근', () => {
    test('로그인 페이지 접근 가능', async ({ page }) => {
        const response = await page.goto('/login');
        expect(response?.status()).toBe(200);
    });

    test('수검준비 페이지 접근 가능', async ({ page }) => {
        const response = await page.goto('/inspection-prep');
        expect(response?.status()).toBe(200);
    });

    test('자료실 페이지 접근 가능', async ({ page }) => {
        const response = await page.goto('/resources');
        expect(response?.status()).toBe(200);
    });

    test('오프라인 페이지 접근 가능 (/offline)', async ({ page }) => {
        const response = await page.goto('/offline');
        expect(response?.status()).toBe(200);
    });
});
