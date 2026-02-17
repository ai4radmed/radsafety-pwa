import { test, expect } from '@playwright/test';
import { hasSession, applySession, isSessionExpired } from './helpers/auth';

/**
 * 인증 후 관리자 기능 테스트 (반자동화)
 *
 * 수동 체크리스트 3-4 자동화:
 * - 관리자 메뉴 노출
 * - 회원관리: 목록 표시
 * - 인증 요청: 목록 표시
 * - 의견 관리: 목록 표시 + View Transitions 재방문
 * - 용어 관리: 목록 표시 + View Transitions 재방문
 * - 알림 발송: 폼 표시
 * - 관리자 설정: 페이지 표시
 *
 * 사전 조건:
 *   npm run test:e2e:save-session 으로 관리자 세션 저장 필요
 *   세션이 없으면 해당 테스트는 자동으로 skip됩니다.
 *
 * 실행: npm run test:e2e:auth
 */

test.beforeAll(async () => {
    if (!hasSession('admin')) {
        console.log('\n⚠ 관리자 세션 파일 없음. npm run test:e2e:save-session 먼저 실행하세요.\n');
    }
    if (isSessionExpired('admin')) {
        console.log('\n⚠ 관리자 세션이 만료되었습니다. 재저장이 필요합니다.\n');
    }
});

test.describe('3-4 관리자 기능 (인증 후)', () => {
    test.beforeEach(async ({ context }) => {
        if (!hasSession('admin') || isSessionExpired('admin')) {
            test.skip();
            return;
        }
        await applySession(context, 'admin');
    });

    // ── 사이드바 관리자 메뉴 ────────────────────────────────
    test('사이드바 — 관리자 메뉴 노출', async ({ page }) => {
        await page.goto('/mypage');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/mypage');

        // 사이드바에 관리자 링크가 있어야 함
        const adminLink = page.locator('a[href*="/admin"]');
        await expect(adminLink.first()).toBeVisible({ timeout: 5000 });
        console.log('  ✓ 관리자 메뉴 노출 확인');
    });

    // ── 회원관리 ─────────────────────────────────────────────
    test('회원관리 — 목록 표시', async ({ page }) => {
        await page.goto('/admin/members');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/admin/members');
        await expect(page).toHaveTitle(/회원관리|회원 관리|RadSafety/);

        // 관리자 가드 통과 (비관리자면 /로 리다이렉트됨)
        expect(page.url()).not.toBe('/');
        expect(page.url()).not.toContain('/login');
    });

    // ── 인증 요청 ─────────────────────────────────────────────
    test('인증 요청 — 목록 표시', async ({ page }) => {
        await page.goto('/admin/verification-requests');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/admin/verification-requests');
        await expect(page).toHaveTitle(/인증|RadSafety/);
        await expect(page.locator('body')).not.toContainText('로딩 중...');
    });

    // ── 의견 관리 ─────────────────────────────────────────────
    test('의견 관리 — 목록 표시', async ({ page }) => {
        await page.goto('/admin/feedback');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/admin/feedback');
        await expect(page).toHaveTitle(/의견|RadSafety/);
        await expect(page.locator('body')).not.toContainText('로딩 중...');
    });

    test('의견 관리 — View Transitions 재방문 시 데이터 표시 (로딩 중 고정 없음)', async ({ page }) => {
        // 초기 방문
        await page.goto('/admin/feedback');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).not.toContainText('로딩 중...');

        // 다른 페이지로 이동 (View Transitions)
        const mypageLink = page.locator('a[href="/mypage"]').first();
        if (await mypageLink.isVisible()) {
            await mypageLink.click();
            await page.waitForURL('**/mypage');
            await page.waitForLoadState('networkidle');

            // /admin/feedback 으로 돌아오기
            const feedbackLink = page.locator('a[href="/admin/feedback"]').first();
            if (await feedbackLink.isVisible()) {
                await feedbackLink.click();
                await page.waitForURL('**/admin/feedback');
                await page.waitForLoadState('networkidle');

                // "로딩 중..." 고정 없음 — View Transitions 재방문 버그
                await expect(page.locator('body')).not.toContainText('로딩 중...');
                console.log('  ✓ 의견 관리 재방문 정상');
            }
        }
    });

    // ── 용어 관리 ─────────────────────────────────────────────
    test('용어 관리 — 목록 표시', async ({ page }) => {
        await page.goto('/admin/glossary');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/admin/glossary');
        await expect(page).toHaveTitle(/용어|RadSafety/);
        await expect(page.locator('body')).not.toContainText('로딩 중...');
    });

    test('용어 관리 — View Transitions 재방문 시 데이터 표시', async ({ page }) => {
        await page.goto('/admin/glossary');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).not.toContainText('로딩 중...');

        // 다른 페이지로 이동
        const mypageLink = page.locator('a[href="/mypage"]').first();
        if (await mypageLink.isVisible()) {
            await mypageLink.click();
            await page.waitForURL('**/mypage');
            await page.waitForLoadState('networkidle');

            // 용어 관리로 돌아오기
            const glossaryLink = page.locator('a[href="/admin/glossary"]').first();
            if (await glossaryLink.isVisible()) {
                await glossaryLink.click();
                await page.waitForURL('**/admin/glossary');
                await page.waitForLoadState('networkidle');
                await expect(page.locator('body')).not.toContainText('로딩 중...');
                console.log('  ✓ 용어 관리 재방문 정상');
            }
        }
    });

    // ── 알림 발송 ─────────────────────────────────────────────
    test('알림 발송 — 폼 표시', async ({ page }) => {
        await page.goto('/admin/send-notification');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/admin/send-notification');
        await expect(page).toHaveTitle(/알림|RadSafety/);
    });

    // ── 관리자 설정 ───────────────────────────────────────────
    test('관리자 설정 — 페이지 표시', async ({ page }) => {
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        // /admin/settings는 비관리자 접근 시 / 로 리다이렉트되므로
        // 관리자 세션이면 /admin/settings에 머물러야 함
        expect(page.url()).toContain('/admin/settings');
        await expect(page).toHaveTitle(/설정|RadSafety/);
    });

    // ── 콘솔 에러 없음 확인 ───────────────────────────────────
    test('관리자 페이지 — 콘솔 에러 없음', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        const adminPages = ['/admin/members', '/admin/feedback', '/admin/glossary', '/admin/verification-requests'];

        for (const path of adminPages) {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
        }

        if (errors.length > 0) {
            console.warn('콘솔 에러 발견:', errors);
        }
        // 심각한 에러(Supabase 401/403, JS 예외 등)가 없어야 함
        const criticalErrors = errors.filter(
            (e) => e.includes('401') || e.includes('403') || e.includes('500') || e.includes('TypeError'),
        );
        expect(criticalErrors).toHaveLength(0);
    });
});
