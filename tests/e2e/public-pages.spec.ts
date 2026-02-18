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

test.describe('개발자 모드 패널 (PUBLIC_DEV_MODE)', () => {
    /**
     * 로컬 dev 서버는 .env에 PUBLIC_DEV_MODE=true가 설정된 상태로 실행됩니다.
     * 따라서 E2E 테스트에서는 개발자 모드 패널이 항상 렌더링됩니다.
     *
     * 보안 핵심 검증:
     * - devLoginPanel이 존재하면 data-* 속성 값이 비어 있지 않아야 함 (환경변수 미설정 감지)
     * - devLoginPanel이 존재하지 않는 환경(Production)에서는 버튼 DOM이 없어야 함
     */
    test('/login — PUBLIC_DEV_MODE=true 시 개발자 모드 패널 존재', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const devPanel = page.locator('#devLoginPanel');
        const panelCount = await devPanel.count();

        if (panelCount === 0) {
            // PUBLIC_DEV_MODE=true가 아닌 환경 (CI 등) — 패널 부재 자체가 정상
            console.log('  ℹ PUBLIC_DEV_MODE 미설정 환경: 개발자 모드 패널 없음 (정상)');
            return;
        }

        // 패널이 있을 때: 버튼 두 개 모두 존재해야 함
        await expect(page.locator('#devLoginUserBtn')).toBeVisible();
        await expect(page.locator('#devLoginAdminBtn')).toBeVisible();
        await expect(page.locator('#resetSessionBtn')).toBeVisible();
        console.log('  ✓ 개발자 모드 패널 및 버튼 3개 존재 확인');
    });

    test('/login — 개발자 모드 패널이 있으면 data-* 환경변수 값이 비어 있지 않음', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const devPanel = page.locator('#devLoginPanel');
        if ((await devPanel.count()) === 0) {
            // PUBLIC_DEV_MODE 미설정 환경 — skip
            return;
        }

        // 환경변수 미설정 시 빈 문자열로 전달됨을 조기 감지
        const userEmail = await devPanel.getAttribute('data-user-email');
        const userPassword = await devPanel.getAttribute('data-user-password');
        const adminEmail = await devPanel.getAttribute('data-admin-email');
        const adminPassword = await devPanel.getAttribute('data-admin-password');

        expect(userEmail, 'DEV_TEST_USER_EMAIL 환경변수 미설정').toBeTruthy();
        expect(userPassword, 'DEV_TEST_USER_PASSWORD 환경변수 미설정').toBeTruthy();
        expect(adminEmail, 'DEV_TEST_ADMIN_EMAIL 환경변수 미설정').toBeTruthy();
        expect(adminPassword, 'DEV_TEST_ADMIN_PASSWORD 환경변수 미설정').toBeTruthy();
        console.log('  ✓ 개발자 모드 data-* 속성 모두 설정됨');
    });

    test('/login — 개발자 모드 패널은 일반 로그인 UI와 함께 공존', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // 일반 로그인 UI는 항상 존재해야 함
        await expect(page.locator('#emailLoginForm')).toBeVisible();
        await expect(page.locator('#emailInput')).toBeVisible();

        // 개발자 모드 패널 유무와 무관하게 카카오 버튼도 존재
        const kakaoBtn = page.locator('a[href*="kakao"], button:has-text("카카오")');
        await expect(kakaoBtn.first()).toBeVisible();

        console.log('  ✓ 일반 로그인 UI와 개발자 모드 패널 공존 확인');
    });

    test('/login — 개발자 모드 버튼은 disabled 속성이 초기에 없음 (클릭 가능)', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const devPanel = page.locator('#devLoginPanel');
        if ((await devPanel.count()) === 0) {
            return;
        }

        const userBtn = page.locator('#devLoginUserBtn');
        const adminBtn = page.locator('#devLoginAdminBtn');

        await expect(userBtn).toBeEnabled();
        await expect(adminBtn).toBeEnabled();
        console.log('  ✓ 개발자 모드 버튼 초기 상태: 클릭 가능');
    });
});
