/**
 * Doctor 헬스체크 점검 함수 모음.
 *
 * 요청이 흐르는 순서(① 앱 호스트 → ② 설정 → ③ 백엔드 → ④ 데이터 → ⑤ 기능 → ⑥ 메타)로
 * 각 층을 독립 함수로 프로브해 CheckResult 를 반환한다.
 *
 * 제약(명세 .spec/src/lib/health-checks.md):
 *  - 부작용 없음: 읽기·설정 확인만. 메일/푸시 발송·DB 쓰기 금지.
 *  - 비밀값 원문 반환 금지: 각 check 는 ok/ms 와 범주형 detail 만 노출.
 *  - 각 점검은 개별 timeout·try/catch. 실패는 ok:false 로 보고하고 throw 하지 않는다.
 */
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-server';
import { APP_VERSION, APP_RELEASE_DATE } from '../consts';

export type CheckResult = {
    name: string;
    layer: 1 | 2 | 3 | 4 | 5 | 6;
    ok: boolean;
    ms: number;
    detail?: string;
};

const DEFAULT_TIMEOUT_MS = 3000;

/** 프로브가 timeout 을 넘기면 거부(reject). 성공값은 그대로 통과. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/**
 * 한 점검을 timeout·try/catch 로 감싸 CheckResult 로 만든다.
 * probe 는 성공 시 optional detail(범주형 문자열)을 반환, 실패 시 throw.
 */
async function timed(
    name: string,
    layer: CheckResult['layer'],
    probe: () => Promise<string | void>,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<CheckResult> {
    const start = Date.now();
    try {
        const detail = await withTimeout(Promise.resolve().then(probe), timeoutMs);
        return { name, layer, ok: true, ms: Date.now() - start, ...(detail ? { detail } : {}) };
    } catch (err) {
        return { name, layer, ok: false, ms: Date.now() - start, detail: categorize(err) };
    }
}

/**
 * 에러를 비밀값 없는 짧은 범주 문자열로 변환.
 * Supabase 에러는 Error 인스턴스가 아니라 { code, message } 평범한 객체라 code 를 우선 확인.
 */
function categorize(err: unknown): string {
    if (err && typeof err === 'object') {
        const message = (err as { message?: string }).message || '';
        if (message.includes('infinite recursion')) return 'infinite-recursion';

        // PostgREST/Supabase 에러 코드만 노출(값·URL·행 데이터 제외)
        const code = (err as { code?: string }).code;
        if (typeof code === 'string' && code.length > 0) return `error:${code}`;
        if (err instanceof Error) {
            if (err.message === 'timeout') return 'timeout';
            return err.message.slice(0, 60);
        }
        if (message.length > 0) return message.slice(0, 60);
    }
    return 'error';
}

// ── ① 앱 호스트 (Vercel) ──────────────────────────────────────────────
// 이 함수가 실행된다는 것 자체가 배포·SSR 런타임 생존 증거. 항상 ok.
export async function checkAppHost(): Promise<CheckResult[]> {
    return [
        await timed('app-host', 1, async () => {
            // Vercel 은 VERCEL_REGION 을 런타임 process.env 에만 주입(import.meta.env 엔 없음).
            const region =
                import.meta.env.VERCEL_REGION ||
                (typeof process !== 'undefined' ? process.env.VERCEL_REGION : undefined) ||
                'local';
            return `region=${region}`;
        }),
    ];
}

// ── ② 설정 (Config) ──────────────────────────────────────────────────
// 필수 env 존재·형식. 값은 노출하지 않고 누락된 키 이름만 detail 에.
const REQUIRED_ENV = ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const OPTIONAL_ENV = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'PUBLIC_VAPID_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'PUBLIC_ADMIN_EMAILS',
];

function envPresent(name: string): boolean {
    const v = import.meta.env[name];
    return typeof v === 'string' && v.trim().length > 0;
}

function isValidHttpsUrl(url: string | undefined): boolean {
    try {
        return !!url && new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
}

export async function checkConfig(): Promise<CheckResult[]> {
    return [
        await timed('config', 2, async () => {
            const missingRequired = REQUIRED_ENV.filter((k) => !envPresent(k));
            const missingOptional = OPTIONAL_ENV.filter((k) => !envPresent(k));

            if (missingRequired.length > 0) {
                throw new Error(`missing required: ${missingRequired.join(',')}`);
            }
            // URL 형식 검증(파싱 가능·https 여부만)
            if (!isValidHttpsUrl(import.meta.env.PUBLIC_SUPABASE_URL)) {
                throw new Error('PUBLIC_SUPABASE_URL invalid format');
            }
            return missingOptional.length > 0 ? `optional missing: ${missingOptional.join(',')}` : undefined;
        }),
    ];
}

// ── ③ 백엔드 (Supabase) ──────────────────────────────────────────────
// shallow: DB 경량 핑만. deep: + Auth 도달 + Storage 도달.
export async function checkSupabase(deep: boolean): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // DB 경량 핑 — head count(행 데이터 미수신). 무료티어 pause·다운 감지.
    results.push(
        await timed('db-ping', 3, async () => {
            const { error } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
            if (error) throw error;
        }),
    );

    if (!deep) return results;

    // Auth 도달 — 최소 admin 조회(반환 데이터는 폐기, 도달 여부만).
    results.push(
        await timed('auth-reach', 3, async () => {
            const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
            if (error) throw error;
        }),
    );

    // Storage 도달 — 버킷 목록(메타만).
    results.push(
        await timed('storage-reach', 3, async () => {
            const { error } = await supabaseAdmin.storage.listBuckets();
            if (error) throw error;
        }),
    );

    return results;
}

// ── ④ 데이터 · 스키마 (deep) ─────────────────────────────────────────
// 핵심 테이블 존재 확인. 테이블명은 비밀 아님(리포지토리 공개 스키마).
const CORE_TABLES = ['profiles', 'findings', 'notifications', 'verification_requests', 'archives', 'feedback'];

export async function checkSchema(): Promise<CheckResult[]> {
    return [
        await timed('schema', 4, async () => {
            const missing: string[] = [];
            for (const t of CORE_TABLES) {
                const { error } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
                // 42P01 = undefined_table, PGRST205 = 스키마 캐시에 테이블 없음
                if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
                    missing.push(t);
                }
            }
            if (missing.length > 0) throw new Error(`missing tables: ${missing.join(',')}`);
        }),
    ];
}

// ── ④-2 데이터 · RLS (deep) ─────────────────────────────────────────
export async function checkRlsPolicies(): Promise<CheckResult[]> {
    return [
        await timed('rls-policies', 4, async () => {
            const email =
                import.meta.env.DEV_TEST_USER_EMAIL ||
                (typeof process !== 'undefined' ? process.env.DEV_TEST_USER_EMAIL : undefined);
            const password =
                import.meta.env.DEV_TEST_USER_PASSWORD ||
                (typeof process !== 'undefined' ? process.env.DEV_TEST_USER_PASSWORD : undefined);

            if (!email || !password) {
                return 'skipped: env missing';
            }

            const url = import.meta.env.PUBLIC_SUPABASE_URL;
            const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

            if (!url || !anonKey) {
                throw new Error('Supabase URL or Anon Key missing');
            }

            // 1단계: 격리된 임시 anon 클라이언트를 활용해 비로그인 차단 검증
            const tempClient = createClient(url, anonKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            });

            // 비로그인 상태로 findings 조회 시도 (보통 빈 결과 혹은 차단 에러)
            const { error: anonError } = await tempClient.from('findings').select('*', { count: 'exact', head: true });

            if (anonError) {
                // 비로그인 시 RLS에 의해 거부 에러가 발생하는 것은 정상 가드 작동으로 허용 (예: 401, 403, 400 등)
                const code = anonError.code;
                const msg = anonError.message || '';
                const isRlsBlock =
                    ['PGRST301', '42501'].includes(code) || msg.includes('policy') || msg.includes('permission');
                if (!isRlsBlock && code !== 'PGRST116') {
                    // RLS 거부나 빈 데이터 조회가 아닌 일반 에러라면 실패 처리
                    throw anonError;
                }
            }

            // 2단계: 인증된(로그인 완료) 사용자로 RLS 무한 재귀 검증
            const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                throw new Error(`auth failed: ${authError.message}`);
            }

            try {
                // 로그인 상태에서 profiles 쿼리를 시도 (무한 루프/무한 재귀 시 에러 발생)
                const { error: rlsError } = await tempClient
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                if (rlsError) {
                    throw rlsError;
                }
            } finally {
                // 검증 후 명시적 로그아웃 (세션 정리)
                await tempClient.auth.signOut().catch(() => {});
            }
        }),
    ];
}

// ── ⑤ 기능 (deep, 부작용 없이) ───────────────────────────────────────
// Resend·VAPID 자격/형식 유효성만. 실제 발송 없음. (콘텐츠 로드는 astro:content
// 컨텍스트가 필요해 엔드포인트 deep 경로에서 별도 'content' 점검으로 수행.)
export async function checkFunctional(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // Resend — 키 형식('re_' 접두) + 발신 주소 형식. 발송 안 함.
    results.push(
        await timed('resend-config', 5, async () => {
            const key = import.meta.env.RESEND_API_KEY;
            const from = import.meta.env.RESEND_FROM_EMAIL;
            // 미설정(missing)과 형식 불량(invalid)을 구분 — 진단·조치가 다르다.
            if (!key) throw new Error('RESEND_API_KEY missing');
            if (!key.startsWith('re_')) throw new Error('RESEND_API_KEY invalid format');
            if (!from) throw new Error('RESEND_FROM_EMAIL missing');
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) {
                throw new Error('RESEND_FROM_EMAIL invalid format');
            }
        }),
    );

    // VAPID — 페어 존재 + base64url 형식·길이. setVapidDetails 재호출(부작용) 없이 형식만.
    results.push(
        await timed('vapid-pair', 5, async () => {
            const pub = import.meta.env.PUBLIC_VAPID_KEY;
            const priv = import.meta.env.VAPID_PRIVATE_KEY;
            if (!pub || !priv) throw new Error('VAPID pair missing');
            const b64url = /^[A-Za-z0-9_-]+$/;
            // P-256: 공개키 ~87자(65바이트), 개인키 ~43자(32바이트)
            if (!b64url.test(pub) || pub.length < 80) throw new Error('VAPID public invalid');
            if (!b64url.test(priv) || priv.length < 40) throw new Error('VAPID private invalid');
        }),
    );

    return results;
}

// ── ⑥ 메타 ───────────────────────────────────────────────────────────
export async function checkMeta(): Promise<CheckResult[]> {
    return [
        await timed('meta', 6, async () => {
            return `v${APP_VERSION} (${APP_RELEASE_DATE})`;
        }),
    ];
}

/**
 * mode 에 따라 점검을 실행하고 결과를 평탄한 CheckResult[] 로 반환.
 * shallow: ① 앱 · ② 설정 · ③ DB핑 · ⑥ 메타
 * deep:    위 + ③ Auth·Storage · ④ 스키마 · ⑤ 기능
 */
export async function runChecks(mode: 'shallow' | 'deep'): Promise<CheckResult[]> {
    const deep = mode === 'deep';
    const groups = await Promise.all([
        checkAppHost(),
        checkConfig(),
        checkSupabase(deep),
        ...(deep ? [checkSchema(), checkRlsPolicies(), checkFunctional()] : []),
        checkMeta(),
    ]);
    return groups.flat();
}
