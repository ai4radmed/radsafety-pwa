import { test, expect } from '@playwright/test';

/**
 * PWA / 웹 푸시 자동 검증
 *
 * 자동 검증 가능 항목:
 *  - manifest.webmanifest 응답 및 필수 필드
 *  - sw-push.js 정적 파일 서빙 (push/notificationclick 핸들러 포함 여부)
 *  - /api/push/subscribe 엔드포인트 존재 (비로그인 시 401 반환)
 *  - manifest 아이콘 충분 여부 (128px 이상, 배지용)
 *
 * 자동 검증 불가 (수동/반자동 → test_strategy.md 참조):
 *  - 실제 브라우저 알림 권한 허용 팝업 표시 여부
 *  - 기기 상단 알림 팝업 수신 확인
 *  - iOS PWA 설치 후 알림 동작
 */

test.describe('PWA 기본 검증', () => {
    test('manifest.webmanifest 응답 확인', async ({ page }) => {
        const response = await page.goto('/manifest.webmanifest');
        expect(response?.status()).toBe(200);

        const manifest = await response?.json();
        expect(manifest?.name).toBeDefined();
        expect(manifest?.icons).toBeDefined();
        expect(manifest?.icons.length).toBeGreaterThan(0);
    });
});

test.describe('웹 푸시 인프라 검증 (비로그인)', () => {
    test('sw-push.js 정적 파일이 서빙된다', async ({ page }) => {
        const response = await page.goto('/sw-push.js');
        expect(response?.status()).toBe(200);

        const contentType = response?.headers()['content-type'] ?? '';
        expect(contentType).toContain('javascript');

        const body = await response?.text();
        // push 이벤트 핸들러가 포함되어 있는지
        expect(body).toContain("addEventListener('push'");
        // notificationclick 핸들러가 포함되어 있는지
        expect(body).toContain("addEventListener('notificationclick'");
    });

    test('/api/push/subscribe 엔드포인트가 존재한다 (비로그인 → 401)', async ({ request }) => {
        const response = await request.post('/api/push/subscribe', {
            data: {
                endpoint: 'https://example.com/push/fake',
                p256dh: 'fake-p256dh',
                auth: 'fake-auth',
            },
        });
        // 비로그인 → 401 (엔드포인트가 존재하고 인증 검사가 동작함)
        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBeDefined();
    });

    test('/api/push/unsubscribe 엔드포인트가 존재한다 (비로그인 → 401)', async ({ request }) => {
        const response = await request.delete('/api/push/unsubscribe', {
            data: { endpoint: 'https://example.com/push/fake' },
        });
        // 비로그인 → 401 (엔드포인트가 존재하고 인증 검사가 동작함)
        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBeDefined();
    });

    test('/api/push/subscribe 빈 body → 401 (인증 우선 검사)', async ({ request }) => {
        const response = await request.post('/api/push/subscribe', {
            data: {},
        });
        // 비로그인이므로 유효성 검사(400) 이전에 인증 검사(401)가 먼저 실행됨
        expect(response.status()).toBe(401);
    });

    test('/api/push/unsubscribe 빈 body → 401 (인증 우선 검사)', async ({ request }) => {
        const response = await request.delete('/api/push/unsubscribe', {
            data: {},
        });
        expect(response.status()).toBe(401);
    });

    test('manifest에 배지용 아이콘(128px 이상)이 포함된다', async ({ page }) => {
        const response = await page.goto('/manifest.webmanifest');
        const manifest = await response?.json();

        const icons = manifest?.icons ?? [];
        const hasSufficientIcon = icons.some((icon: { sizes: string }) => {
            const [w] = (icon.sizes ?? '0x0').split('x').map(Number);
            return w >= 128;
        });
        expect(hasSufficientIcon).toBe(true);
    });
});
