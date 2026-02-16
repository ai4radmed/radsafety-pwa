import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
    test('manifest.webmanifest 응답 확인', async ({ page }) => {
        const response = await page.goto('/manifest.webmanifest');
        expect(response?.status()).toBe(200);

        const manifest = await response?.json();
        expect(manifest?.name).toBeDefined();
        expect(manifest?.icons).toBeDefined();
        expect(manifest?.icons.length).toBeGreaterThan(0);
    });
});
