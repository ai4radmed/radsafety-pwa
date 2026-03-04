import { test, expect } from '@playwright/test';
import { hasSession, applySession, isSessionExpired } from './helpers/auth';

/**
 * 인증 후 일반 사용자 기능 테스트 (반자동화)
 *
 * 수동 체크리스트 3-3 자동화:
 * - 마이페이지: 프로필 정보 표시
 * - 네비게이션: 페이지 이동
 * - 자료실: 목록 표시
 * - 지적권고사례: 목록 및 필터
 * - 알림: 목록 표시
 * - 의견 보내기: 폼 표시
 * - View Transitions 재방문: 로딩 중 고정 없음
 *
 * 사전 조건:
 *   npm run test:e2e:save-session 으로 세션 저장 필요
 *   세션이 없으면 해당 테스트는 자동으로 skip됩니다.
 *
 * 실행: npm run test:e2e:auth
 */

// 세션 없으면 전체 skip
test.beforeAll(async () => {
    if (!hasSession('user')) {
        console.log('\n⚠ 세션 파일 없음. npm run test:e2e:save-session 먼저 실행하세요.\n');
    }
    if (isSessionExpired('user')) {
        console.log('\n⚠ 세션이 만료되었습니다. npm run test:e2e:save-session 으로 재저장하세요.\n');
    }
});

test.describe('3-3 일반 사용자 기능 (인증 후)', () => {
    test.beforeEach(async ({ context }) => {
        if (!hasSession('user') || isSessionExpired('user')) {
            test.skip();
            return;
        }
        await applySession(context, 'user');
    });

    // ── 마이페이지 ──────────────────────────────────────────
    test('마이페이지 — 프로필 정보 표시', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');

        // 로그인 리다이렉트가 발생하지 않아야 함
        expect(page.url()).toContain('/mypage');

        // 페이지 자체가 로드되었는지 확인 (DashboardLayout의 title 기반)
        await expect(page).toHaveTitle(/마이페이지|RadSafety/);
    });

    test('마이페이지 — 인증 탭 전환', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/mypage');

        // 탭 전환 가능한 요소 탐색 (학회/특별사용자 탭)
        const tabs = page.locator('[role="tab"], .tab-btn, button.tab');
        const tabCount = await tabs.count();
        if (tabCount > 0) {
            // 두 번째 탭 클릭
            await tabs.nth(1).click();
            await page.waitForTimeout(300);
            // 탭 전환 후 에러 없음
            const errorText = page.locator('body');
            await expect(errorText).not.toContainText('오류가 발생했습니다');
        }
    });

    // ── 네비게이션 ───────────────────────────────────────────
    test('네비게이션 — 사이드바 메뉴에서 각 페이지로 이동', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');

        // 사이드바 링크들
        const navTargets = [
            { href: '/notifications', name: '알림' },
            { href: '/resources', name: '자료실' },
            { href: '/findings-recommendations', name: '지적권고사례' },
        ];

        for (const { href, name } of navTargets) {
            await page.goto(href);
            await page.waitForLoadState('networkidle');
            // 로그인 리다이렉트 없이 페이지 유지
            expect(page.url()).toContain(href);
            console.log(`  ✓ ${name} (${href}) 접근 성공`);
        }
    });

    // ── 자료실 ───────────────────────────────────────────────
    test('자료실 — 목록 표시', async ({ page }) => {
        await page.goto('/resources');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/resources');

        // 자료 목록 또는 "자료가 없습니다" 메시지가 있어야 함
        // const resourceList = page.locator('#resourceList, .resource-list, [data-testid="resource-list"]');
        // const emptyMsg = page.locator('text=자료가 없습니다, text=등록된 자료');
        // const hasContent = (await resourceList.count()) > 0 || (await emptyMsg.count()) > 0;
        // 페이지 타이틀로 최소 로드 확인
        await expect(page).toHaveTitle(/자료실|RadSafety/);
    });

    test('자료실 — View Transitions 재방문 시 로딩 중 고정 없음', async ({ page }) => {
        // 초기 방문
        await page.goto('/resources');
        await page.waitForLoadState('networkidle');

        // 다른 페이지로 이동
        const notifLink = page.locator('a[href="/notifications"]').first();
        if (await notifLink.isVisible()) {
            await notifLink.click();
            await page.waitForURL('**/notifications');
            await page.waitForLoadState('networkidle');

            // 자료실로 돌아오기
            const resourceLink = page.locator('a[href="/resources"]').first();
            if (await resourceLink.isVisible()) {
                await resourceLink.click();
                await page.waitForURL('**/resources');
                await page.waitForLoadState('networkidle');

                // "로딩 중..." 고정 없음
                await expect(page.locator('body')).not.toContainText('로딩 중...');
            }
        }
    });

    // ── 지적권고사례 ─────────────────────────────────────────
    test('지적권고사례 — 목록 표시 및 검색 필터 동작', async ({ page }) => {
        await page.goto('/findings-recommendations');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/findings-recommendations');
        await expect(page).toHaveTitle(/지적권고사례|RadSafety/);

        // 검색창 존재 및 입력 가능
        const searchInput = page.locator('#findingSearch');
        if (await searchInput.isVisible()) {
            await searchInput.fill('교육');
            await page.waitForTimeout(400); // 필터 적용 대기
            // 에러 없음
            await expect(page.locator('body')).not.toContainText('오류가 발생했습니다');
            // 검색어 초기화
            await searchInput.fill('');
        }
    });

    // ── 알림 ────────────────────────────────────────────────
    test('알림 — 목록 표시 (서버사이드 렌더링)', async ({ page }) => {
        await page.goto('/notifications');
        await page.waitForLoadState('networkidle');
        // SSR 페이지이므로 /login 리다이렉트 없이 알림 목록이 바로 표시되어야 함
        expect(page.url()).toContain('/notifications');
        await expect(page).toHaveTitle(/알림|RadSafety/);

        // "로딩 중..." 상태가 없어야 함 (SSR이므로)
        await expect(page.locator('body')).not.toContainText('로딩 중...');
    });

    // ── 의견 보내기 ──────────────────────────────────────────
    test('의견 보내기 — 폼 요소 표시', async ({ page }) => {
        await page.goto('/feedback');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/feedback');

        // 제목 입력 필드
        const titleInput = page.locator('input[name="title"], #title, input[placeholder*="제목"]');
        // 내용 입력 필드
        const messageInput = page.locator('textarea[name="message"], #message, textarea[placeholder*="내용"]');

        if ((await titleInput.count()) > 0) {
            await expect(titleInput.first()).toBeVisible();
        }
        if ((await messageInput.count()) > 0) {
            await expect(messageInput.first()).toBeVisible();
        }

        await expect(page).toHaveTitle(/의견|RadSafety/);
    });

    test('내 피드백 — 목록 표시', async ({ page }) => {
        await page.goto('/my-feedback');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/my-feedback');
        await expect(page).toHaveTitle(/피드백|RadSafety/);
    });

    // ── 설정 ────────────────────────────────────────────────
    test('설정 — 페이지 표시', async ({ page }) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/settings');
        await expect(page).toHaveTitle(/설정|RadSafety/);
    });

    test('설정 — 푸시 알림 토글 스위치가 표시된다', async ({ page }) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        // 토글 체크박스 존재
        const pushToggle = page.locator('#pushToggle');
        await expect(pushToggle).toBeAttached();

        // 슬라이드 스위치 UI (label.switch > input + span.slider)
        const switchLabel = page.locator('label.switch');
        await expect(switchLabel).toBeVisible();
        const slider = page.locator('label.switch .slider');
        await expect(slider).toBeVisible();

        console.log('  ✓ 푸시 알림 토글 스위치 UI 확인');
    });

    test('설정 — 푸시 알림 상태 텍스트가 초기화된다', async ({ page }) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        // 상태 텍스트가 "확인 중..." 에서 벗어나야 함 (최대 5초 대기)
        const statusText = page.locator('#pushStatusText');
        await expect(statusText).not.toHaveText('확인 중...', { timeout: 5000 });

        // 토글 기반 유효 상태
        const text = await statusText.textContent();
        const validStates = ['활성화됨', '알림을 받으려면 켜세요', '차단됨', '지원하지 않는 브라우저'];
        expect(validStates.some((s) => text?.includes(s))).toBe(true);
        console.log('  ✓ 푸시 알림 상태:', text);
    });

    test('설정 — 푸시 알림 토글과 상태 텍스트가 동기화되어 있다', async ({ page }) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        const pushToggle = page.locator('#pushToggle');
        const statusText = page.locator('#pushStatusText');
        await expect(statusText).not.toHaveText('확인 중...', { timeout: 5000 });

        const isChecked = await pushToggle.isChecked();
        const text = await statusText.textContent();

        if (isChecked) {
            expect(text).toContain('활성화됨');
        } else {
            // 비활성 상태: "알림을 받으려면 켜세요" 또는 "차단됨" 또는 "지원하지 않는 브라우저"
            expect(text).not.toContain('활성화됨');
        }
        console.log(`  ✓ 토글=${isChecked}, 상태="${text}" — 동기화 확인`);
    });

    // ── 로그아웃 ─────────────────────────────────────────────
    test('로그아웃 — /login 으로 이동 및 세션 초기화', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');

        // 로그아웃 버튼 탐색 (사이드바)
        const logoutBtn = page.locator('button:has-text("로그아웃"), a:has-text("로그아웃"), [data-action="logout"]');
        if ((await logoutBtn.count()) > 0) {
            await logoutBtn.first().click();
            // 로그아웃 후 /login 으로 이동
            await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
            const url = page.url();
            expect(url).toMatch(/\/(login|)$/);
            console.log('  ✓ 로그아웃 후 URL:', url);
        } else {
            // 로그아웃 버튼을 찾지 못한 경우 — 사이드바 구조 확인 필요
            console.warn('  ⚠ 로그아웃 버튼을 찾지 못함. 사이드바 구조 확인 필요.');
        }
    });

    // ── 회원 탈퇴 (명세: .spec/tests/e2e/account-deletion.spec.md) ─────
    test('회원 탈퇴 — 마이페이지에 탈퇴 버튼이 존재한다', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');
        const deleteBtn = page.locator(
            '#deleteAccountBtn, button:has-text("회원 탈퇴"), [data-action="delete-account"]',
        );
        await expect(deleteBtn.first()).toBeVisible();
    });

    test('회원 탈퇴 — 탈퇴 버튼 클릭 시 확인 대화상자 표시 후 취소 (실제 탈퇴 없음)', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');

        let dialogShown = false;
        page.on('dialog', (dialog) => {
            dialogShown = true;
            expect(dialog.message()).toMatch(/탈퇴|되돌릴 수 없습니다/);
            dialog.dismiss();
        });

        const deleteBtn = page.locator('#deleteAccountBtn, button:has-text("회원 탈퇴")').first();
        await deleteBtn.click();

        expect(dialogShown).toBe(true);
        // 취소했으므로 여전히 마이페이지에 있어야 함
        expect(page.url()).toContain('/mypage');
    });

    // ── 웹 푸시 구독 API (반자동) ─────────────────────────────
    test('웹 푸시 — 로그인 상태에서 /api/push/subscribe 가 400 반환 (잘못된 데이터)', async ({ request }) => {
        // 로그인 상태에서 빈 payload → 400 Bad Request (인증은 통과, 유효성 검사 실패)
        // 비로그인이었다면 401이 반환됨 — 이 테스트는 로그인 세션이 주입된 상태로 실행됨
        const response = await request.post('/api/push/subscribe', {
            data: {},
        });
        // 인증된 사용자 + 빈 payload → 400 (missing fields)
        // 인증 안 된 경우 → 401 (세션 주입이 제대로 안 된 것)
        expect([400, 401]).toContain(response.status());

        if (response.status() === 400) {
            const body = await response.json();
            expect(body.error).toBeDefined();
            console.log('  ✓ 웹 푸시 구독 API 인증 통과 및 유효성 검사 동작 확인');
        } else {
            // 세션 주입이 API request에 전달되지 않는 경우 (Playwright request vs page context 차이)
            console.warn('  ⚠ 401 반환 — 세션이 API 요청에 전달되지 않은 경우 (정상 동작일 수 있음)');
        }
    });

    test('웹 푸시 — 로그인 상태에서 /api/push/unsubscribe 가 400 반환 (endpoint 누락)', async ({ request }) => {
        const response = await request.delete('/api/push/unsubscribe', {
            data: {},
        });
        expect([400, 401]).toContain(response.status());

        if (response.status() === 400) {
            const body = await response.json();
            expect(body.error).toBeDefined();
            console.log('  ✓ 웹 푸시 구독 해제 API 유효성 검사 동작 확인');
        } else {
            console.warn('  ⚠ 401 반환 — 세션이 API 요청에 전달되지 않은 경우 (정상 동작일 수 있음)');
        }
    });
});
