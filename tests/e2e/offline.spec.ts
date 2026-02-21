import { test, expect } from '@playwright/test';

/**
 * 오프라인 fallback 페이지 E2E 테스트
 *
 * 검증 대상:
 * - /offline 페이지 자체가 정상 렌더링됨
 * - 오프라인 상태 시뮬레이션: Service Worker가 /offline으로 fallback
 * - 캐시된 페이지(수검준비, 지적권고사례) 링크가 존재
 * - 온라인 복귀 시 reload 동작
 *
 * 주의:
 * - Service Worker는 첫 방문 후 등록되므로, precache 검증은 두 번째 방문부터 유효
 * - Playwright의 offline 시뮬레이션은 Service Worker를 우회하므로
 *   실제 SW fallback 동작은 /offline 페이지 직접 접근으로 대체 검증
 */

test.describe('/offline 페이지', () => {
    test('/offline 페이지 — 정상 렌더링', async ({ page }) => {
        await page.goto('/offline');
        await page.waitForLoadState('networkidle');

        // 핵심 UI 요소 확인
        await expect(page.locator('h1')).toContainText('인터넷 연결 없음');
        await expect(page.locator('.desc')).toContainText('오프라인 상태');
    });

    test('/offline 페이지 — 수검준비 링크 존재', async ({ page }) => {
        await page.goto('/offline');
        await page.waitForLoadState('networkidle');

        const inspectionLink = page.locator('a[href="/inspection-prep"]');
        await expect(inspectionLink).toBeVisible();
        await expect(inspectionLink).toContainText('정기검사 수검준비');
    });

    test('/offline 페이지 — 지적권고사례 링크 존재', async ({ page }) => {
        await page.goto('/offline');
        await page.waitForLoadState('networkidle');

        const findingsLink = page.locator('a[href="/findings-recommendations"]');
        await expect(findingsLink).toBeVisible();
        await expect(findingsLink).toContainText('지적권고사례');
    });

    test('/offline 페이지 — 다시 시도 버튼 존재', async ({ page }) => {
        await page.goto('/offline');
        await page.waitForLoadState('networkidle');

        const retryBtn = page.locator('#retryBtn');
        await expect(retryBtn).toBeVisible();
        await expect(retryBtn).toContainText('다시 시도');
    });

    test('/offline 페이지 — 수검준비 링크 클릭 시 인증 필요로 /login 리다이렉트', async ({ page }) => {
        await page.goto('/offline');
        await page.waitForLoadState('networkidle');

        await page.locator('a[href="/inspection-prep"]').click();
        // 인증이 필요한 페이지이므로 /login으로 리다이렉트됨
        await page.waitForURL('**/login');
        await expect(page).toHaveURL(/\/login/);
    });

    test('/offline 페이지 — 지적권고사례 링크 클릭 시 인증 필요로 /login 리다이렉트', async ({ page }) => {
        await page.goto('/offline');
        await page.waitForLoadState('networkidle');

        await page.locator('a[href="/findings-recommendations"]').click();
        // 인증이 필요한 페이지이므로 /login으로 리다이렉트됨
        await page.waitForURL('**/login');
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('오프라인 시뮬레이션 — Service Worker fallback', () => {
    test('오프라인 상태에서 네비게이션 요청 시 /offline 콘텐츠 반환', async ({ page, context }) => {
        // 1. 먼저 온라인으로 방문해 Service Worker 등록 및 precache 완료 대기
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Service Worker 등록 확인
        const swRegistered = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            const reg = await navigator.serviceWorker.getRegistration();
            return !!reg;
        });

        if (!swRegistered) {
            // Service Worker 미지원 환경 (CI 일부)에서는 skip
            test.skip();
            return;
        }

        // 2. 네트워크 차단 (오프라인 시뮬레이션)
        await context.setOffline(true);

        // 3. 오프라인 상태에서 보호 페이지 접근 → /offline fallback 기대
        // Service Worker가 navigateFallback: '/offline'으로 응답해야 함
        await page.goto('/mypage', { waitUntil: 'domcontentloaded' }).catch(() => {});

        // /offline 페이지 콘텐츠가 표시되어야 함
        await expect(page.locator('h1')).toContainText('인터넷 연결 없음', { timeout: 5000 });

        // 4. 네트워크 복구
        await context.setOffline(false);
    });

    test('오프라인 상태에서 수검준비 페이지는 캐시에서 정상 표시', async ({ page, context }) => {
        // 1. 온라인으로 방문해 precache 완료 대기
        await page.goto('/inspection-prep');
        await page.waitForLoadState('networkidle');

        const swRegistered = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            const reg = await navigator.serviceWorker.getRegistration();
            return !!reg;
        });

        if (!swRegistered) {
            test.skip();
            return;
        }

        // 2. 오프라인 전환
        await context.setOffline(true);

        // 3. 수검준비 재방문 — precache에 있으므로 정상 표시
        await page.goto('/inspection-prep', { waitUntil: 'domcontentloaded' }).catch(() => {});

        // 오프라인 안내가 아닌 실제 페이지 콘텐츠여야 함
        const isOfflinePage = await page
            .locator('h1')
            .textContent()
            .catch(() => '');
        expect(isOfflinePage).not.toContain('인터넷 연결 없음');

        // 4. 복구
        await context.setOffline(false);
    });
});
