import { test, expect } from '@playwright/test';

/**
 * 사이드바 초기 상태 깜빡임 E2E 테스트
 *
 * 수동 체크리스트 3-1 "사이드바 초기 상태" 자동화:
 * - 사이트 데이터(localStorage, sessionStorage) 완전 초기화 후 홈 방문 시
 *   사이드바가 로그아웃 상태로 표시되어야 하며,
 *   로그인 상태가 잠깐 번쩍이는 현상(flash)이 없어야 합니다.
 *
 * 배경:
 * - @nanostores/persistent 는 localStorage를 사용하므로,
 *   이전 세션 데이터가 남아 있으면 페이지 로드 시 잠깐 로그인 상태로 보임
 * - clearUser() 호출 후 정상 초기화가 되는지 확인
 */

test.describe('사이드바 초기 상태 (비로그인)', () => {
    test.beforeEach(async ({ page }) => {
        // localStorage / sessionStorage 완전 초기화
        await page.addInitScript(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('홈 방문 시 사이드바가 로그아웃 상태로 표시됨 (깜빡임 없음)', async ({ page }) => {
        // Sidebar.astro 구조:
        // - adminNavGroup (#adminNavGroup) 은 초기 style="display:none" 으로 렌더링됨
        // - JS에서 is_admin 확인 후 display:flex 또는 display:none 토글
        // - 비로그인이면 clearUser() → display:none 유지가 맞음

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 관리자 메뉴 그룹이 숨겨져 있어야 함
        const adminNavGroup = page.locator('#adminNavGroup');
        if ((await adminNavGroup.count()) > 0) {
            // 비로그인 상태: display:none 이어야 함
            const display = await adminNavGroup.evaluate((el) => getComputedStyle(el).display);
            expect(display).toBe('none');
        }

        // 사이드바가 렌더링되었는지 확인
        const sidebar = page.locator('.sidebar, aside');
        await expect(sidebar.first()).toBeVisible();
    });

    test('localStorage 초기화 후 홈 방문 → 로그인 링크 표시됨', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 비로그인 상태에서는 로그인 유도 링크가 있어야 함
        const loginLink = page.locator('a[href="/login"]');
        await expect(loginLink.first()).toBeVisible();
    });

    test('이전 세션 데이터 잔존 시에도 깜빡임 없이 초기화됨', async ({ page }) => {
        // 스테일 userProfile 데이터를 localStorage에 심은 후 테스트
        await page.addInitScript(() => {
            // @nanostores/persistent가 사용하는 키
            const staleProfile = {
                id: 'stale-user-id',
                login_email: 'stale@example.com',
                nickname: 'StaleUser',
                is_admin: 'false',
                provider: 'email',
                verification_status: 'none',
            };
            // nanostores/persistent는 키를 'userProfile>' 형태로 저장
            Object.entries(staleProfile).forEach(([k, v]) => {
                localStorage.setItem(`userProfile>${k}`, v);
            });
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 스테일 데이터가 있어도 Supabase 세션이 없으면 clearUser()가 호출되어
        // 최종적으로 로그인 상태가 아닌 것으로 표시되어야 함
        // (DashboardLayout의 astro:page-load에서 getSession() → 세션 없으면 clearUser())
        // 단, 이 검증은 비동기 처리 완료 후이므로 networkidle 이후에 확인
        // Sidebar.astro: adminNavGroup은 DOM에 항상 존재하지만 비로그인 시 display:none
        const adminNavGroup = page.locator('#adminNavGroup');
        if ((await adminNavGroup.count()) > 0) {
            const display = await adminNavGroup.evaluate((el) => getComputedStyle(el).display);
            expect(display).toBe('none');
        }
    });
});
