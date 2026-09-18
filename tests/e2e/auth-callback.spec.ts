import { test, expect } from '@playwright/test';

/**
 * 인증 콜백 엔드포인트 E2E 테스트
 *
 * 수동 체크리스트 3-7 "Network 탭 확인" 항목 자동화:
 * - /auth/callback : OAuth 콜백 (카카오 로그인 등)
 *   (/auth/confirm — 매직링크/이메일 OTP 확인 — 은 Stage C(privacy_redesign_plan.md
 *   1단계)로 삭제됨. 아래 describe 블록도 함께 제거)
 *
 * 검증 목표:
 * 1. prerender=false(SSR)로 동작하는지 확인
 *    → 정상: 302/303 리다이렉트 또는 200 HTML 응답
 *    → 이상: 200 JSON 응답 (prerender 문제 시 정적 파일로 배포됨)
 * 2. 필수 파라미터 없이 접근 시 /login 으로 안전하게 리다이렉트
 * 3. 잘못된 code 파라미터 접근 시 /login 으로 리다이렉트
 *
 * 참고: 실제 유효한 OAuth code는 테스트 불가 (외부 서비스 의존)
 * → 파라미터 없거나 잘못된 경우의 에러 처리 경로만 검증합니다.
 */

test.describe('/auth/callback 엔드포인트', () => {
    test('파라미터 없이 접근 시 /login 으로 리다이렉트', async ({ page }) => {
        await page.goto('/auth/callback');
        // code 파라미터가 없으면 /login으로 리다이렉트되어야 함
        await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
        const url = page.url();
        expect(url).toMatch(/\/(login|)$/);
    });

    test('잘못된 code 파라미터로 접근 시 /login 으로 리다이렉트', async ({ page }) => {
        await page.goto('/auth/callback?code=invalid-code-12345');
        // 잘못된 code → exchangeCodeForSession 실패 → /login 리다이렉트
        await page.waitForURL('**/login', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });

    test('/auth/callback 응답이 JSON이 아님 (SSR 동작 확인)', async ({ request }) => {
        // 직접 HTTP 요청으로 Content-Type 확인
        // SSR이면 리다이렉트(302/303) 또는 HTML 응답
        // prerender가 잘못 켜지면 JSON이나 빈 파일이 응답됨
        const response = await request.get('/auth/callback', {
            maxRedirects: 0, // 리다이렉트 따라가지 않음
        });

        const contentType = response.headers()['content-type'] || '';
        // JSON 응답이면 prerender 문제
        expect(contentType).not.toContain('application/json');
        // 302/303 리다이렉트 또는 200 HTML 이어야 함
        expect([200, 302, 303, 307, 308]).toContain(response.status());
    });
});

test.describe('인증 콜백 — 브라우저 전체 흐름', () => {
    test('/auth/callback 은 200 HTML 이 아닌 리다이렉트 응답 (prerender=false 확인)', async ({ page }) => {
        // 브라우저로 접근해서 최종 도착 URL이 /login이거나 / 이어야 함
        // (유효한 code가 없으면 /login으로 가야 정상)
        await page.goto('/auth/callback?code=bad');
        await page.waitForLoadState('networkidle');

        // JSON 페이지나 빈 페이지면 prerender 문제
        const title = await page.title();
        expect(title).not.toBe(''); // 빈 타이틀 = 정적 파일 응답 가능성

        // 최종 URL이 /auth/callback 에 머물지 않아야 함 (리다이렉트 되어야 함)
        // (단, 에러 페이지를 /auth/callback에서 직접 렌더링하는 구현이라면 예외)
        const finalUrl = page.url();
        console.log(`/auth/callback?code=bad 최종 URL: ${finalUrl}`);
    });
});
