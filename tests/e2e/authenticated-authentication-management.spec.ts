import { test, expect } from '@playwright/test';
import { hasSession, applySession, isSessionExpired } from './helpers/auth';

/**
 * 인증관리(리팩토링 후) 기능 테스트
 *
 * 1. 메뉴 명칭 변경 확인: "회원 인증 관리" -> "인증관리"
 * 2. 탭 명칭 변경 확인: "최종인증" -> "관리자인증"
 * 3. 미인증 탭 데이터 로딩 및 헤더 확인
 */

test.describe('인증관리 리팩토링 테스트', () => {
    test.beforeEach(async ({ context, page }) => {
        page.on('console', (msg) => console.log('BROWSER:', msg.text()));

        const sessionData = {
            access_token: 'dummy',
            refresh_token: 'dummy',
            expires_at: 9999999999,
            user: {
                id: 'admin-id',
                email: 'benkorea.ai@gmail.com',
                user_metadata: { is_admin: 'true' },
            },
        };
        const sessionStr = JSON.stringify(sessionData);

        // Nanostores 및 Supabase용 데이터 주입
        await page.addInitScript(
            ({ sessionStr }) => {
                localStorage.setItem('sb-wfnvvczfzbqzhjrxxznq-auth-token', sessionStr);
                localStorage.setItem('userProfile:id', 'admin-id');
                localStorage.setItem('userProfile:is_admin', 'true');
                localStorage.setItem('userProfile:login_email', 'benkorea.ai@gmail.com');

                // 쿠키도 추가 (SSR 대응)
                document.cookie = `sb-wfnvvczfzbqzhjrxxznq-auth-token=${b64encode(sessionStr)}; path=/;`;

                function b64encode(str: string) {
                    return btoa(
                        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
                            return String.fromCharCode(parseInt(p1, 16));
                        }),
                    );
                }
            },
            { sessionStr },
        );

        if (!hasSession('admin') || isSessionExpired('admin')) {
            test.skip();
            return;
        }
        await applySession(context, 'admin');
    });

    test('페이지 제목 및 탭 명칭 확인', async ({ page }) => {
        await page.goto('/admin/verification-requests?bypass_admin=true');
        await page.waitForLoadState('networkidle');

        // 1. 페이지 제목 확인
        const pageTitle = page.locator('.page-title');
        await expect(pageTitle).toHaveText('인증관리');

        // 2. 탭 명칭 확인 ("관리자인증" 탭이 있어야 함)
        const verifiedTab = page.locator('.status-tab[data-status="verified"]');
        await expect(verifiedTab).toContainText('관리자인증');

        // 3. 미인증 탭 확인
        const noneTab = page.locator('.status-tab[data-status="none"]');
        await expect(noneTab).toContainText('미인증');
    });

    test('미인증 탭 헤더 및 데이터 로딩 확인', async ({ page }) => {
        await page.goto('/admin/verification-requests?bypass_admin=true');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => (window as any).controllerLoaded);

        // 미인증 탭 클릭
        const noneTab = page.locator('.status-tab[data-status="none"]');
        await noneTab.click();

        // 테이블 헤더 확인 ("가입일"로 변경되었는지)
        const dateHeader = page.locator('#dateHeader');
        await expect(dateHeader).toHaveText('가입일');

        // "로딩 중..."이 사라지는지 확인
        await expect(page.locator('#usersTableBody')).not.toContainText('로딩 중...');
    });
});
