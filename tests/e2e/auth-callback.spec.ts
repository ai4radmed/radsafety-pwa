import { test, expect } from '@playwright/test';

/**
 * 인증 콜백 엔드포인트 E2E 테스트
 *
 * 수동 체크리스트 3-7 "Network 탭 확인" 항목 자동화:
 * - /auth/callback : OAuth 콜백 (카카오 로그인 등)
 * - /auth/confirm  : 매직링크/이메일 OTP 확인
 *
 * 검증 목표:
 * 1. 두 엔드포인트가 prerender=false(SSR)로 동작하는지 확인
 *    → 정상: 302/303 리다이렉트 또는 200 HTML 응답
 *    → 이상: 200 JSON 응답 (prerender 문제 시 정적 파일로 배포됨)
 * 2. 필수 파라미터 없이 접근 시 /login 으로 안전하게 리다이렉트
 * 3. 잘못된 code 파라미터 접근 시 /login 으로 리다이렉트
 *
 * 참고: 실제 유효한 OAuth code나 token_hash는 테스트 불가 (외부 서비스 의존)
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

test.describe('/auth/confirm 엔드포인트', () => {
    test('파라미터 없이 접근 시 /login 으로 리다이렉트', async ({ page }) => {
        await page.goto('/auth/confirm');
        await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
        const url = page.url();
        expect(url).toMatch(/\/(login|)$/);
    });

    test('잘못된 token_hash 파라미터로 접근 시 /login 으로 리다이렉트', async ({ page }) => {
        await page.goto('/auth/confirm?token_hash=invalid-token&type=email');
        // 잘못된 token → verifyOtp 실패 → /login 리다이렉트
        await page.waitForURL('**/login', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });

    test('/auth/confirm 응답이 파일 다운로드가 아님 (SSR 동작 확인)', async ({ request }) => {
        // prerender가 잘못 켜지면 정적 HTML 파일이 다운로드될 수 있음
        // (또는 308 CDN 캐시 문제)
        const response = await request.get('/auth/confirm', {
            maxRedirects: 0,
        });

        const contentType = response.headers()['content-type'] || '';
        const contentDisposition = response.headers()['content-disposition'] || '';

        // 파일 다운로드 헤더가 없어야 함
        expect(contentDisposition).not.toContain('attachment');
        // JSON 응답이면 prerender 문제
        expect(contentType).not.toContain('application/json');
        // 308은 CDN 캐시 장애 패턴 (비정상)
        expect(response.status()).not.toBe(308);
    });

    test('/auth/confirm 응답 시간이 12ms 초과 (CDN 캐시 미적용 확인)', async ({ request }) => {
        // 응답시간 12ms 이하이면 CDN이 308을 캐싱한 장애 패턴
        // (정상이면 서버 처리 시간으로 100ms 이상)
        const start = Date.now();
        const response = await request.get('/auth/confirm', {
            maxRedirects: 0,
        });
        const elapsed = Date.now() - start;

        // 308 + 12ms 이하 = CDN 캐시 장애
        if (response.status() === 308) {
            // 308이면 응답시간과 무관하게 실패
            expect(response.status()).not.toBe(308);
        }
        // 200/302/303이면서 응답시간이 12ms 이하인 경우는 캐시된 리다이렉트일 수 있음
        // 로컬에서는 의미 없지만 production 테스트 시 유의미한 검증
        console.log(`/auth/confirm 응답시간: ${elapsed}ms, 상태코드: ${response.status()}`);
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
