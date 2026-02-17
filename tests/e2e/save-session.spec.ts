import { test } from '@playwright/test';
import { saveSession } from './helpers/auth';

/**
 * 세션 저장 스크립트
 *
 * 사용법: npm run test:e2e:save-session
 *
 * 실행 시 브라우저 창이 열립니다.
 * 1. 카카오 또는 이메일 매직링크로 실제 로그인하세요.
 * 2. /mypage 에 도달하면 세션이 자동 저장됩니다.
 *
 * 저장 위치:
 * - tests/fixtures/session-user.json  (일반 사용자)
 * - tests/fixtures/session-admin.json (관리자 계정으로 로그인 시)
 *
 * 세션 유효기간: Supabase 기본값 1시간 (refresh_token으로 자동 갱신)
 * .gitignore에 포함되어 있으므로 커밋되지 않습니다.
 */

test.use({
    // 헤드리스 모드 비활성화 — 직접 로그인해야 하므로 브라우저 창이 열려야 함
    headless: false,
    // 타임아웃 5분 — 이메일 수신 등의 시간 고려
    actionTimeout: 300000,
});

test('세션 저장 — 일반 사용자', async ({ page, context }) => {
    console.log('\n==============================');
    console.log('브라우저에서 로그인해주세요.');
    console.log('/mypage 에 도달하면 세션이 자동 저장됩니다.');
    console.log('==============================\n');

    await page.goto('/login');

    // /mypage에 도달할 때까지 대기 (최대 5분)
    await page.waitForURL('**/mypage', { timeout: 300000 });

    // 페이지 완전 로드 대기
    await page.waitForLoadState('networkidle');

    // 세션 저장
    await saveSession(page, 'user');
    console.log('✅ 일반 사용자 세션 저장 완료');
    console.log('이제 npm run test:e2e:auth 로 인증 후 기능 테스트를 실행할 수 있습니다.');
});

test('세션 저장 — 관리자', async ({ page }) => {
    console.log('\n==============================');
    console.log('관리자 계정으로 로그인해주세요.');
    console.log('/mypage 에 도달하면 세션이 자동 저장됩니다.');
    console.log('==============================\n');

    await page.goto('/login');

    await page.waitForURL('**/mypage', { timeout: 300000 });
    await page.waitForLoadState('networkidle');

    await saveSession(page, 'admin');
    console.log('✅ 관리자 세션 저장 완료');
});
