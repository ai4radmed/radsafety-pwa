import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * RLS(행 수준 보안) 정책 검증 — 보안 통합 테스트.
 *
 * 왜 health 엔드포인트가 아니라 여기인가:
 *  - 실제 로그인(signInWithPassword)이라 부작용이 있고(auth 세션·rate limit),
 *    DEV_TEST_USER_* 자격이 필요하다(프로덕션 금지 env). → 런타임 프로브가 아니라 테스트.
 *  - RLS 정합성은 마이그레이션/정책이 바뀔 때만 변하는 배포시 불변식 → PR/배포마다 검증.
 *
 * 자격(DEV_TEST_USER_*·Supabase URL/anon)이 없으면 skip한다(CI 미설정 시 실패 아님).
 * 활성화하려면 GitHub secret 에 DEV_TEST_USER_EMAIL·DEV_TEST_USER_PASSWORD 추가 후
 * test.yml e2e job env 로 전달(이미 배선됨).
 */

const url = process.env.PUBLIC_SUPABASE_URL;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.DEV_TEST_USER_EMAIL;
const testPassword = process.env.DEV_TEST_USER_PASSWORD;

const hasCreds = Boolean(url && anonKey && testEmail && testPassword);

// eslint-disable-next-line no-console
console.log(
    `[RLS-DEBUG] hasCreds=${hasCreds} url=${!!url} anon=${!!anonKey} email=${!!testEmail} pw=${!!testPassword}`,
);

test.describe('RLS 정책 검증 (보안)', () => {
    test.skip(!hasCreds, 'Supabase URL/anon 또는 DEV_TEST_USER_* 미설정 — 검증 생략');

    test('비로그인 anon 은 findings 를 무단 조회하지 못한다 (RLS 가드)', async () => {
        const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
        const { error } = await anon.from('findings').select('*', { count: 'exact', head: true });

        // RLS 정책 거부(PGRST301/42501/policy·permission) 또는 빈 결과(PGRST116)는 정상 가드.
        // 그 외 일반 에러는 실패.
        if (error) {
            const code = error.code ?? '';
            const isRlsBlock =
                ['PGRST301', '42501', 'PGRST116'].includes(code) || /policy|permission/.test(error.message);
            expect(isRlsBlock, `예상치 못한 에러: ${code} ${error.message}`).toBe(true);
        }
    });

    test('로그인 사용자의 profiles 조회에 RLS 무한 재귀가 없다', async () => {
        const client = createClient(url!, anonKey!, { auth: { persistSession: false } });

        const { error: authError } = await client.auth.signInWithPassword({
            email: testEmail!,
            password: testPassword!,
        });
        expect(authError, `테스트 계정 로그인 실패: ${authError?.message}`).toBeNull();

        try {
            const { error } = await client.from('profiles').select('*', { count: 'exact', head: true });
            // profiles 가 자기 자신을 참조하는 정책이면 "infinite recursion detected" 발생 → 회귀 감지.
            expect(error?.message ?? '', 'RLS 무한 재귀 감지').not.toContain('infinite recursion');
            expect(error, `profiles 조회 에러: ${error?.message}`).toBeNull();
        } finally {
            await client.auth.signOut().catch(() => {});
        }
    });
});
