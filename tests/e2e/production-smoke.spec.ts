import { test, expect, type Page } from '@playwright/test';

// 명세: .spec/tests/e2e/production-smoke.spec.md
//
// 프로덕션 배포를 실제 브라우저로 여는 최소 스모크 — HTTP 점검(check-production.mjs)이
// 못 보는 "JS 크래시로 인한 백지 화면"을 감지한다. 부작용 0: 공개 화면 열람만.
//
// SMOKE_BASE_URL 이 설정된 경우에만 실행된다(playwright.config 의 production-smoke 프로젝트).
// 평상시 CI e2e 에서는 chromium 프로젝트의 testIgnore 로 제외.

test.skip(!process.env.SMOKE_BASE_URL, 'SMOKE_BASE_URL 미설정 — 프로덕션 스모크는 헬스체크 워크플로 전용');

/** 페이지의 미처리 예외를 수집한다. console.error 는 실패시키지 않고 로그만 남긴다(오탐 방지). */
function collectPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`[console.error] ${msg.text()}`);
    });
    return errors;
}

test.describe('프로덕션 스모크', () => {
    test('홈이 JS 크래시 없이 렌더링된다', async ({ page }) => {
        const pageErrors = collectPageErrors(page);

        await page.goto('/', { waitUntil: 'load' });

        await expect(page).toHaveTitle(/RadSafety|방사선/, { timeout: 15000 });
        const navLinks = page.locator(
            'a[href="/inspection-prep"], a[href="/resources"], a[href="/findings-recommendations"]',
        );
        await expect(navLinks.first()).toBeVisible({ timeout: 15000 });

        expect(pageErrors, `브라우저 미처리 예외 발생: ${pageErrors.join(' | ')}`).toEqual([]);
    });

    test('로그인 화면이 JS 크래시 없이 그려진다', async ({ page }) => {
        const pageErrors = collectPageErrors(page);

        await page.goto('/login', { waitUntil: 'load' });

        // 이메일 OTP 1단계 폼 — 입력·제출은 하지 않는다(부작용 0)
        await expect(page.locator('#emailOtpRequestForm')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('#emailOtpEmail')).toBeVisible();

        expect(pageErrors, `브라우저 미처리 예외 발생: ${pageErrors.join(' | ')}`).toEqual([]);
    });
});
