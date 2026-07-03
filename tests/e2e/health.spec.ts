import { test, expect } from '@playwright/test';

/**
 * GET /api/health — Doctor 헬스체크 엔드포인트 계약 테스트.
 *
 * 배포 건강성(status 값)이 아니라 **엔드포인트 규약**을 검증한다:
 * 응답 형태·헤더·필드·deep 인증 게이트·비밀값 미노출.
 * 명세: .spec/tests/e2e/health.spec.md
 */

test.describe('GET /api/health (shallow)', () => {
    test('JSON 응답·no-store·기본 필드·checks 형태', async ({ request }) => {
        const res = await request.get('/api/health');

        // 핵심(앱·설정·DB) 상태에 따라 200(ok/degraded) 또는 503(down) — 둘 다 구조화 JSON.
        expect([200, 503]).toContain(res.status());
        expect(res.headers()['content-type']).toContain('application/json');
        expect(res.headers()['cache-control']).toContain('no-store');

        const body = await res.json();
        expect(body.mode).toBe('shallow');
        expect(['ok', 'degraded', 'down']).toContain(body.status);
        expect(body.version).toBeTruthy();
        expect(body.releaseDate).toBeTruthy();
        expect(body.ts).toBeTruthy();
        expect(Array.isArray(body.checks)).toBe(true);

        for (const c of body.checks) {
            expect(c).toHaveProperty('name');
            expect(c).toHaveProperty('layer');
            expect(typeof c.ok).toBe('boolean');
            expect(typeof c.ms).toBe('number');
        }
        // shallow 는 스키마·기능 층을 포함하지 않는다.
        const names = body.checks.map((c: { name: string }) => c.name);
        expect(names).not.toContain('schema');
        expect(names).not.toContain('resend-config');
    });

    test('비밀값 미노출 — 응답 본문에 JWT/키 패턴 없음', async ({ request }) => {
        const res = await request.get('/api/health');
        const text = await res.text();
        // Supabase JWT(eyJ...)·service_role 문자열 등이 새어나오면 실패.
        expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
        expect(text.toLowerCase()).not.toContain('service_role');
    });

    test('ts 신선도 — 요청 시각 근처(매 호출 계산)', async ({ request }) => {
        const body = await (await request.get('/api/health')).json();
        const drift = Math.abs(Date.now() - new Date(body.ts).getTime());
        expect(drift).toBeLessThan(60_000);
    });
});

test.describe('GET /api/health?deep=1 (인증 게이트)', () => {
    test('비로그인 → 401', async ({ request }) => {
        const res = await request.get('/api/health?deep=1');
        expect(res.status()).toBe(401);
    });
});
