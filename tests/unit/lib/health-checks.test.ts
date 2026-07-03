import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Doctor 헬스체크 점검 함수 단위 테스트.
 *
 * Supabase(supabase-server)는 mock, env 는 vi.stubEnv 로 주입.
 * 명세: .spec/tests/unit/health-checks.test.md
 */

// supabase-server mock — from().select() / auth.admin.listUsers / storage.listBuckets.
// vi.mock 팩토리는 호이스팅되므로 상태·mock 을 vi.hoisted 로 만들어 공유한다.
const h = vi.hoisted(() => {
    const selectResult = { error: null as unknown };
    const tableErrors: Record<string, unknown> = {};
    const mockSupabaseAdmin = {
        from: vi.fn((table: string) => ({
            select: vi.fn(() =>
                Promise.resolve(
                    table in tableErrors
                        ? { error: tableErrors[table], count: null }
                        : { error: selectResult.error, count: 0 },
                ),
            ),
        })),
        auth: {
            admin: {
                listUsers: vi.fn(() => Promise.resolve({ data: { users: [] }, error: null })),
            },
        },
        storage: {
            listBuckets: vi.fn(() => Promise.resolve({ data: [], error: null })),
        },
    };
    return { selectResult, tableErrors, mockSupabaseAdmin };
});

vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAdmin: h.mockSupabaseAdmin,
}));

const { selectResult, tableErrors } = h;

// 유효한 기본 env 셋
function stubValidEnv() {
    vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'anon-key-xxx');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-xxx');
    vi.stubEnv('RESEND_API_KEY', 're_abc123');
    vi.stubEnv('RESEND_FROM_EMAIL', 'noreply@radsafety.kr');
    vi.stubEnv('PUBLIC_VAPID_KEY', 'B'.repeat(87));
    vi.stubEnv('VAPID_PRIVATE_KEY', 'p'.repeat(43));
    vi.stubEnv('VAPID_EMAIL', 'mailto:noreply@radsafety.kr');
    vi.stubEnv('PUBLIC_ADMIN_EMAILS', 'admin@radsafety.kr');
}

import {
    checkAppHost,
    checkConfig,
    checkSupabase,
    checkSchema,
    checkFunctional,
    checkMeta,
    runChecks,
} from '../../../src/lib/health-checks';
import { APP_VERSION } from '../../../src/consts';

beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    selectResult.error = null;
    for (const k of Object.keys(tableErrors)) delete tableErrors[k];
    stubValidEnv();
});

describe('checkAppHost', () => {
    it('항상 ok, layer 1', async () => {
        const [r] = await checkAppHost();
        expect(r.ok).toBe(true);
        expect(r.layer).toBe(1);
    });
});

describe('checkConfig', () => {
    it('필수 env 전부 존재 + 유효 URL → ok', async () => {
        const [r] = await checkConfig();
        expect(r.ok).toBe(true);
    });

    it('필수 env 누락 → ok:false, detail 에 키 이름', async () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
        const [r] = await checkConfig();
        expect(r.ok).toBe(false);
        expect(r.detail).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('URL 형식 불량 → ok:false', async () => {
        vi.stubEnv('PUBLIC_SUPABASE_URL', 'not-a-url');
        const [r] = await checkConfig();
        expect(r.ok).toBe(false);
    });

    it('detail 에 실제 비밀값 미노출', async () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
        const [r] = await checkConfig();
        expect(r.detail ?? '').not.toContain('service-key-xxx');
        expect(r.detail ?? '').not.toContain('anon-key-xxx');
    });
});

describe('checkSupabase', () => {
    it('shallow — DB 핑 성공 시 db-ping 1개 ok', async () => {
        const results = await checkSupabase(false);
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('db-ping');
        expect(results[0].ok).toBe(true);
    });

    it('DB 에러 → db-ping ok:false, detail=error:<code>', async () => {
        selectResult.error = { code: 'PGRST301' };
        const results = await checkSupabase(false);
        expect(results[0].ok).toBe(false);
        expect(results[0].detail).toBe('error:PGRST301');
    });

    it('deep — db-ping·auth-reach·storage-reach 3개', async () => {
        const results = await checkSupabase(true);
        expect(results.map((r) => r.name)).toEqual(['db-ping', 'auth-reach', 'storage-reach']);
    });
});

describe('checkSchema', () => {
    it('모든 핵심 테이블 존재 → ok', async () => {
        const [r] = await checkSchema();
        expect(r.ok).toBe(true);
    });

    it('한 테이블 42P01 → ok:false, detail 에 테이블명', async () => {
        tableErrors['findings'] = { code: '42P01' };
        const [r] = await checkSchema();
        expect(r.ok).toBe(false);
        expect(r.detail).toContain('findings');
    });
});

describe('checkFunctional', () => {
    it('Resend·VAPID 유효 → 둘 다 ok', async () => {
        const results = await checkFunctional();
        expect(results.every((r) => r.ok)).toBe(true);
        expect(results.map((r) => r.name)).toEqual(['resend-config', 'vapid-pair']);
    });

    it('Resend 키 형식 불량 → resend-config ok:false', async () => {
        vi.stubEnv('RESEND_API_KEY', 'wrong-prefix');
        const results = await checkFunctional();
        const resend = results.find((r) => r.name === 'resend-config');
        expect(resend?.ok).toBe(false);
    });
});

describe('checkMeta', () => {
    it('ok, detail 에 APP_VERSION', async () => {
        const [r] = await checkMeta();
        expect(r.ok).toBe(true);
        expect(r.detail).toContain(APP_VERSION);
    });
});

describe('runChecks', () => {
    it('shallow — app-host·config·db-ping·meta 4개', async () => {
        const results = await runChecks('shallow');
        expect(results.map((r) => r.name)).toEqual(['app-host', 'config', 'db-ping', 'meta']);
    });

    it('deep — shallow + auth·storage·schema·functional', async () => {
        const names = (await runChecks('deep')).map((r) => r.name);
        expect(names).toEqual([
            'app-host',
            'config',
            'db-ping',
            'auth-reach',
            'storage-reach',
            'schema',
            'resend-config',
            'vapid-pair',
            'meta',
        ]);
    });

    it('프로브 실패를 흡수 — reject 하지 않고 ok:false 로 보고', async () => {
        selectResult.error = { code: 'PGRST301' };
        const results = await runChecks('shallow');
        expect(results.find((r) => r.name === 'db-ping')?.ok).toBe(false);
    });
});
