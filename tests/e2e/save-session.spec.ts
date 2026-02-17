import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { saveSession } from './helpers/auth';

/**
 * 세션 저장 스크립트
 *
 * 사용법: npm run test:e2e:save-session
 *
 * PUBLIC_DEV_MODE=true 환경 (로컬 dev / Preview):
 *   → [개발자 모드] 버튼이 표시되면 자동으로 클릭하여 로그인합니다.
 *   → 환경변수(DEV_TEST_USER_EMAIL 등)가 설정되어 있으면 완전 자동화됩니다.
 *
 * PUBLIC_DEV_MODE 미설정 환경 (Production 등):
 *   → 브라우저 창이 열리고 카카오 또는 이메일 매직링크로 직접 로그인해야 합니다.
 *   → /mypage 에 도달하면 세션이 자동 저장됩니다.
 *
 * 저장 위치:
 * - tests/fixtures/session-user.json  (일반 사용자)
 * - tests/fixtures/session-admin.json (관리자 계정으로 로그인 시)
 *
 * 세션 유효기간: Supabase 기본값 1시간 (refresh_token으로 자동 갱신)
 * .gitignore에 포함되어 있으므로 커밋되지 않습니다.
 */

test.use({
    // 헤드리스 모드 비활성화 — 직접 로그인이 필요한 경우를 위해 브라우저 창 표시
    headless: false,
    // 타임아웃 5분 — 이메일 수신 등의 시간 고려
    actionTimeout: 300000,
});

/**
 * 개발자 모드 버튼을 클릭해 자동 로그인을 시도합니다.
 * 버튼이 없으면 (Production 환경 등) 수동 로그인을 기다립니다.
 *
 * @returns 자동 로그인 성공 여부
 */
async function tryDevModeLogin(page: Page, role: 'user' | 'admin'): Promise<boolean> {
    const devPanel = page.locator('#devLoginPanel');
    const panelVisible = await devPanel.isVisible().catch(() => false);

    if (!panelVisible) {
        return false;
    }

    const btnId = role === 'user' ? '#devLoginUserBtn' : '#devLoginAdminBtn';
    const btn = page.locator(btnId);

    if (!(await btn.isVisible().catch(() => false))) {
        return false;
    }

    // 환경변수 미설정 감지 (data-* 속성이 비어 있으면 클릭해도 alert만 뜸)
    const emailAttr = role === 'user' ? 'data-user-email' : 'data-admin-email';
    const email = await devPanel.getAttribute(emailAttr);
    if (!email) {
        console.log(
            `  ⚠ ${role === 'user' ? 'DEV_TEST_USER_EMAIL' : 'DEV_TEST_ADMIN_EMAIL'} 미설정 — 수동 로그인 필요`,
        );
        return false;
    }

    console.log(`  → [개발자 모드] ${role === 'user' ? '테스트 사용자' : '테스트 관리자'} 버튼 자동 클릭`);
    await btn.click();
    return true;
}

test('세션 저장 — 일반 사용자', async ({ page }) => {
    console.log('\n==============================');
    console.log('[일반 사용자] 세션 저장 시작');
    console.log('==============================\n');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const autoLogin = await tryDevModeLogin(page, 'user');

    if (!autoLogin) {
        console.log('  개발자 모드 버튼 없음 — 직접 로그인해주세요.');
        console.log('  카카오 또는 이메일 매직링크 → /mypage 도달 시 자동 저장됩니다.');
    }

    // /mypage에 도달할 때까지 대기 (최대 5분)
    await page.waitForURL('**/mypage', { timeout: 300000 });
    await page.waitForLoadState('networkidle');

    // 올바른 페이지에 도달했는지 확인
    expect(page.url()).toContain('/mypage');

    await saveSession(page, 'user');
    console.log('\n✅ 일반 사용자 세션 저장 완료');
    console.log('이제 npm run test:e2e:auth 로 인증 후 기능 테스트를 실행할 수 있습니다.');
});

test('세션 저장 — 관리자', async ({ page }) => {
    console.log('\n==============================');
    console.log('[관리자] 세션 저장 시작');
    console.log('==============================\n');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const autoLogin = await tryDevModeLogin(page, 'admin');

    if (!autoLogin) {
        console.log('  개발자 모드 버튼 없음 — 관리자 계정으로 직접 로그인해주세요.');
        console.log('  /mypage 에 도달하면 세션이 자동 저장됩니다.');
    }

    await page.waitForURL('**/mypage', { timeout: 300000 });
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/mypage');

    await saveSession(page, 'admin');
    console.log('\n✅ 관리자 세션 저장 완료');
});
