import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stage 1-A (privacy_redesign_plan.md 1단계) — signUpWithUsername / signInWithUsername /
// claimUsername 단위 테스트. supabase-server 는 이 파일 전용으로 별도 모의한다
// (tests/unit/actions/index.test.ts 의 공유 모의는 auth.admin.* 를 다루지 않음).

const mockProfilesSelect = vi.fn();
const mockProfilesUpsert = vi.fn();
const mockProfilesUpdate = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockAdminDeleteUser = vi.fn();
const mockAdminGetUserById = vi.fn();
const mockAdminUpdateUserById = vi.fn();
const mockCustomSelect = vi.fn();
const mockCustomUpsert = vi.fn();

// 2026-09-20 세션 인증 전환: 액션은 클라이언트 id 대신 세션(src/actions/auth.ts)을 본다.
// 테스트는 auth 를 모의하되 **같은 supabase-server 모의의 profiles 조회**를 타게 해 기존 mock 호출 순서를 보존한다.
// session.userId 가 "로그인한 사람"이다.
const session = { userId: '123e4567-e89b-12d3-a456-426614174000' };
vi.mock('../../../src/actions/auth', async () => {
    const { supabaseAdmin } = await import('../../../src/lib/supabase-server');
    const load = async (opts?: { active?: boolean }) => {
        const { data, error } = await (supabaseAdmin as any)
            .from('profiles')
            .select('is_admin, status')
            .eq('id', session.userId)
            .single();
        if (error) throw new Error('사용자를 찾을 수 없습니다.');
        // 기존 테스트의 profiles 모의가 null 을 돌려주는 경우(아이디 중복 조회용) — 일반 회원으로 간주
        const d = (data ?? {}) as { is_admin?: boolean; status?: string | null };
        if (opts?.active && d.status !== 'active') throw new Error('가입 승인된 회원만 이용할 수 있습니다.');
        return { id: session.userId, isAdmin: Boolean(d.is_admin), status: d.status ?? null };
    };
    return {
        requireUser: (_ctx: unknown, opts?: { active?: boolean }) => load(opts),
        requireAdmin: async () => {
            const u = await load();
            if (!u.isAdmin) throw new Error('관리자 권한이 필요합니다.');
            return u;
        },
    };
});

vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAnon: {},
    supabaseAdmin: {
        from: (table: string) => {
            // hospitals_custom — 관리자가 화면에서 등록한 기관(2026-09-19). 기본은 "없음".
            if (table === 'hospitals_custom') {
                return {
                    select: (_cols?: string) => ({
                        eq: (_col: string, val: string) => ({
                            maybeSingle: () => mockCustomSelect(val),
                        }),
                    }),
                    upsert: (data: unknown, opts?: unknown) => {
                        mockCustomUpsert(data, opts);
                        return Promise.resolve({ error: null });
                    },
                };
            }
            if (table !== 'profiles') throw new Error(`unexpected table: ${table}`);
            return {
                select: (_cols?: string) => ({
                    eq: (_col: string, val: string) => ({
                        maybeSingle: () => mockProfilesSelect(val),
                        single: () => mockProfilesSelect(val),
                    }),
                }),
                // signUpWithUsername 은 upsert(onConflict:'id') 를 쓴다 — 운영 DB의
                // auth.users → profiles 자동생성 트리거와 충돌하지 않기 위해서(규칙 10 참조).
                upsert: (data: unknown, opts?: unknown) => {
                    mockProfilesUpsert(data, opts);
                    return Promise.resolve({ error: null });
                },
                update: (data: unknown) => {
                    mockProfilesUpdate(data);
                    return { eq: () => Promise.resolve({ error: null }) };
                },
            };
        },
        auth: {
            admin: {
                createUser: (attrs: unknown) => mockAdminCreateUser(attrs),
                deleteUser: (id: string) => mockAdminDeleteUser(id),
                getUserById: (id: string) => mockAdminGetUserById(id),
                updateUserById: (id: string, attrs: unknown) => mockAdminUpdateUserById(id, attrs),
            },
        },
    },
}));

vi.mock('../../../src/lib/email', () => ({
    sendVerificationEmail: vi.fn(),
    sendFeedbackEmail: vi.fn(),
}));

vi.mock('../../../src/lib/push', () => ({
    sendPushToUsers: vi.fn(),
}));

const mockCreateNotification = vi.fn();
const mockCreateBulkNotifications = vi.fn();
vi.mock('../../../src/lib/notification-helper', () => ({
    createNotification: (data: unknown) => mockCreateNotification(data),
    createBulkNotifications: (ids: unknown, data: unknown) => mockCreateBulkNotifications(ids, data),
}));

vi.mock('../../../src/config/auth', () => ({
    resolveFeedbackRecipients: vi.fn(),
}));

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { server } from '../../../src/actions/index';

const USER_ID = '123e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
    mockProfilesSelect.mockReset();
    mockProfilesUpsert.mockReset();
    mockProfilesUpdate.mockReset();
    mockAdminCreateUser.mockReset();
    mockAdminDeleteUser.mockReset();
    mockAdminGetUserById.mockReset();
    mockAdminUpdateUserById.mockReset();
    mockCreateNotification.mockReset();
    mockCreateBulkNotifications.mockReset();
    mockCustomSelect.mockReset();
    mockCustomSelect.mockResolvedValue({ data: null });
    mockCustomUpsert.mockReset();
});

describe('server.signUpWithUsername', () => {
    it('형식에 안 맞는 아이디는 거부', async () => {
        await expect((server.signUpWithUsername as any)({ username: 'A', password: 'longenough1' })).rejects.toThrow();
    });

    it('8자 미만 비밀번호는 거부', async () => {
        await expect((server.signUpWithUsername as any)({ username: 'gildong', password: 'short' })).rejects.toThrow();
    });

    it('이미 있는 아이디면 에러', async () => {
        mockProfilesSelect.mockResolvedValue({ data: { id: 'existing' }, error: null });
        await expect(
            (server.signUpWithUsername as any)({ username: 'gildong', password: 'longenough1' }),
        ).rejects.toThrow('이미 사용 중인 아이디입니다.');
        expect(mockAdminCreateUser).not.toHaveBeenCalled();
    });

    it('정상 가입 — 가짜 이메일로 auth 계정 생성 후 profiles upsert(onConflict: id)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

        const result = await (server.signUpWithUsername as any)({ username: 'Gildong', password: 'longenough1' });

        expect(mockAdminCreateUser).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'gildong@radsafety.invalid',
                password: 'longenough1',
                email_confirm: true,
            }),
        );
        // insert 가 아니라 upsert 여야 한다 — 운영 DB의 auth.users → profiles 자동생성
        // 트리거와 충돌하지 않기 위해(2026-09-16 프리뷰 실측, .spec/src/actions/index.md 규칙 10).
        expect(mockProfilesUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                id: USER_ID,
                username: 'gildong',
                provider: 'email',
            }),
            expect.objectContaining({ onConflict: 'id' }),
        );
        expect(result.data).toEqual({ success: true, email: 'gildong@radsafety.invalid' });
    });

    it('auth 계정 생성 실패 시 profiles upsert 호출 안 됨', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: null, error: { message: 'boom' } });

        await expect(
            (server.signUpWithUsername as any)({ username: 'gildong', password: 'longenough1' }),
        ).rejects.toThrow('boom');
        expect(mockProfilesUpsert).not.toHaveBeenCalled();
    });

    it('항상 status: pending 으로 가입한다 (Phase 2, 2단계 개정)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

        await (server.signUpWithUsername as any)({ username: 'gildong', password: 'longenough1' });

        expect(mockProfilesUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'pending', hospital_id: null, society: null }),
            expect.objectContaining({ onConflict: 'id' }),
        );
    });

    it('유효한 hospitalId·society 를 그대로 저장한다 (Phase 2)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

        await (server.signUpWithUsername as any)({
            username: 'gildong',
            password: 'longenough1',
            hospitalId: 'korea-institute-radiological-medical-sciences',
            society: 'nuclear_medicine',
        });

        expect(mockProfilesUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                hospital_id: 'korea-institute-radiological-medical-sciences',
                society: 'nuclear_medicine',
            }),
            expect.objectContaining({ onConflict: 'id' }),
        );
    });

    it('존재하지 않는 hospitalId 는 거부한다 (Phase 2 — UI 우회·데이터 꼬임 방지)', async () => {
        await expect(
            (server.signUpWithUsername as any)({
                username: 'gildong',
                password: 'longenough1',
                hospitalId: 'no-such-hospital',
            }),
        ).rejects.toThrow('알 수 없는 소속기관입니다.');
        expect(mockAdminCreateUser).not.toHaveBeenCalled();
    });

    it('관리자가 등록한 커스텀 기관 id(c-…)는 hospitals_custom 에 있으면 통과한다 (2026-09-19)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
        mockCustomSelect.mockResolvedValue({ data: { id: 'c-0123456789' } });

        await (server.signUpWithUsername as any)({
            username: 'gildong',
            password: 'longenough1',
            hospitalId: 'c-0123456789',
        });

        expect(mockCustomSelect).toHaveBeenCalledWith('c-0123456789');
        expect(mockProfilesUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ hospital_id: 'c-0123456789', hospital_request: null }),
            expect.objectContaining({ onConflict: 'id' }),
        );
    });

    // 기관 등록 요청(2026-09-19) — 목록에 없는 기관은 hospital_id='other' + hospital_request 로 진행.
    it('hospitalRequest 만 주면 hospital_id=other + hospital_request 로 가입한다', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

        await (server.signUpWithUsername as any)({
            username: 'gildong',
            password: 'longenough1',
            hospitalId: '',
            hospitalRequest: '  새로운병원 ',
        });

        expect(mockProfilesUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ hospital_id: 'other', hospital_request: '새로운병원' }),
            expect.objectContaining({ onConflict: 'id' }),
        );
    });

    it('hospitalId 를 확정했으면 hospitalRequest 는 무시된다(hospital_request=null)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

        await (server.signUpWithUsername as any)({
            username: 'gildong',
            password: 'longenough1',
            hospitalId: 'korea-institute-radiological-medical-sciences',
            hospitalRequest: '한국원자력',
        });

        expect(mockProfilesUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                hospital_id: 'korea-institute-radiological-medical-sciences',
                hospital_request: null,
            }),
            expect.objectContaining({ onConflict: 'id' }),
        );
    });

    it('60자 초과 hospitalRequest 는 거부', async () => {
        await expect(
            (server.signUpWithUsername as any)({
                username: 'gildong',
                password: 'longenough1',
                hospitalRequest: 'x'.repeat(61),
            }),
        ).rejects.toThrow();
        expect(mockAdminCreateUser).not.toHaveBeenCalled();
    });

    it('profiles upsert 실패 시 방금 만든 auth 계정을 롤백(삭제)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
        // upsert 자체는 항상 { error: null } 을 주는 공용 모의라, 이 케이스만 따로 override.
        const failingUpsert = vi.fn().mockResolvedValueOnce({ error: { message: 'db down' } });
        // supabase-server 모의의 from().upsert 를 이 테스트에서만 바꿔치기.
        const supa = await import('../../../src/lib/supabase-server');
        const original = (supa.supabaseAdmin as any).from;
        (supa.supabaseAdmin as any).from = (table: string) => {
            const base = original(table);
            return { ...base, upsert: failingUpsert };
        };

        await expect(
            (server.signUpWithUsername as any)({ username: 'gildong', password: 'longenough1' }),
        ).rejects.toThrow('db down');
        expect(mockAdminDeleteUser).toHaveBeenCalledWith(USER_ID);

        (supa.supabaseAdmin as any).from = original;
    });
});

describe('server.signInWithUsername', () => {
    it('존재하지 않는 아이디는 일반 오류 문구(존재 여부 비노출)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        await expect((server.signInWithUsername as any)({ username: 'nobody' })).rejects.toThrow(
            '아이디 또는 비밀번호가 올바르지 않습니다.',
        );
    });

    it('profiles 는 있는데 auth 사용자 조회 실패해도 같은 일반 오류 문구', async () => {
        mockProfilesSelect.mockResolvedValue({ data: { id: USER_ID }, error: null });
        mockAdminGetUserById.mockResolvedValue({ data: null, error: { message: 'not found' } });
        await expect((server.signInWithUsername as any)({ username: 'gildong' })).rejects.toThrow(
            '아이디 또는 비밀번호가 올바르지 않습니다.',
        );
    });

    it('정상 — username 으로 email 을 돌려준다(비밀번호 검증은 클라이언트가 이어서 수행)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: { id: USER_ID }, error: null });
        mockAdminGetUserById.mockResolvedValue({ data: { user: { email: 'gildong@radsafety.invalid' } }, error: null });

        const result = await (server.signInWithUsername as any)({ username: 'Gildong' });
        expect(result.data).toEqual({ success: true, email: 'gildong@radsafety.invalid' });
    });
});

describe('server.claimUsername', () => {
    beforeEach(() => {
        session.userId = USER_ID;
    });
    it('다른 사용자가 이미 쓰는 아이디면 에러', async () => {
        mockProfilesSelect.mockResolvedValue({ data: { id: 'someone-else' }, error: null });
        await expect((server.claimUsername as any)({ userId: USER_ID, username: 'gildong' })).rejects.toThrow(
            '이미 사용 중인 아이디입니다.',
        );
        expect(mockAdminUpdateUserById).not.toHaveBeenCalled();
    });

    it('본인이 이미 그 아이디를 갖고 있으면(재확정) 통과', async () => {
        mockProfilesSelect.mockResolvedValue({ data: { id: USER_ID }, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        const result = await (server.claimUsername as any)({ userId: USER_ID, username: 'gildong' });
        expect(result.data).toEqual({ success: true, email: 'gildong@radsafety.invalid' });
    });

    it('정상 — auth.users.email 교체 + profiles.username 갱신 (login_email/nickname 컬럼은 2-2 에서 삭제)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({ userId: USER_ID, username: 'Gildong' });

        expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
            USER_ID,
            expect.objectContaining({ email: 'gildong@radsafety.invalid', email_confirm: true }),
        );
        expect(mockProfilesUpdate).toHaveBeenCalledWith(expect.objectContaining({ username: 'gildong' }));
    });

    it('password 를 같이 주면 updateUserById 에 password 도 실린다 (Stage B, 이메일 OTP 출신 전환)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({ userId: USER_ID, username: 'gildong', password: 'longenough1' });

        expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
            USER_ID,
            expect.objectContaining({
                email: 'gildong@radsafety.invalid',
                email_confirm: true,
                password: 'longenough1',
            }),
        );
    });

    it('password 없이 호출하면 updateUserById 에 password 필드가 없다 (카카오 — 선택 사항)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({ userId: USER_ID, username: 'gildong' });

        const [, attrs] = mockAdminUpdateUserById.mock.calls[0];
        expect(attrs).not.toHaveProperty('password');
    });

    it('8자 미만 password 는 거부', async () => {
        await expect(
            (server.claimUsername as any)({ userId: USER_ID, username: 'gildong', password: 'short' }),
        ).rejects.toThrow();
        expect(mockAdminUpdateUserById).not.toHaveBeenCalled();
    });

    it('hospitalId·society 를 주면 profiles 갱신에 포함된다 (Phase 2 — 신규 pending 계정 전환)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({
            userId: USER_ID,
            username: 'gildong',
            hospitalId: 'korea-institute-radiological-medical-sciences',
            society: 'technology',
        });

        expect(mockProfilesUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                hospital_id: 'korea-institute-radiological-medical-sciences',
                society: 'technology',
            }),
        );
    });

    it('hospitalId·society 를 안 주면 profiles 갱신에 그 키 자체가 없다 (Phase 2 — 기존 active 계정 전환 시 값을 안 건드림)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({ userId: USER_ID, username: 'gildong' });

        const [updateArg] = mockProfilesUpdate.mock.calls[0];
        expect(updateArg).not.toHaveProperty('hospital_id');
        expect(updateArg).not.toHaveProperty('hospital_request');
        expect(updateArg).not.toHaveProperty('society');
    });

    it('hospitalRequest 를 주면(목록에 없는 기관) hospital_id=other + hospital_request 로 갱신', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({
            userId: USER_ID,
            username: 'gildong',
            hospitalId: '',
            hospitalRequest: '새로운병원',
        });

        expect(mockProfilesUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ hospital_id: 'other', hospital_request: '새로운병원' }),
        );
    });
});

describe('server.resolveHospitalRequest', () => {
    const ADMIN_ID = '223e4567-e89b-12d3-a456-426614174000';
    beforeEach(() => {
        session.userId = ADMIN_ID;
    });

    it('관리자가 아니면 거부', async () => {
        mockProfilesSelect.mockResolvedValueOnce({ data: { is_admin: false }, error: null });
        await expect(
            (server.resolveHospitalRequest as any)({ adminId: ADMIN_ID, targetUserId: USER_ID }),
        ).rejects.toThrow('관리자 권한이 필요합니다.');
        expect(mockProfilesUpdate).not.toHaveBeenCalled();
    });

    it("'other' 나 목록에 없는 hospitalId 는 거부", async () => {
        await expect(
            (server.resolveHospitalRequest as any)({ adminId: ADMIN_ID, targetUserId: USER_ID, hospitalId: 'other' }),
        ).rejects.toThrow('알 수 없는 소속기관입니다.');
        mockProfilesSelect.mockResolvedValueOnce({ data: { is_admin: true }, error: null });
        await expect(
            (server.resolveHospitalRequest as any)({
                adminId: ADMIN_ID,
                targetUserId: USER_ID,
                hospitalId: 'no-such-hospital',
            }),
        ).rejects.toThrow('알 수 없는 소속기관입니다.');
        expect(mockProfilesUpdate).not.toHaveBeenCalled();
    });

    it('확정 — hospital_id 갱신 + hospital_request 비움 + 가입자 알림', async () => {
        mockProfilesSelect
            .mockResolvedValueOnce({ data: { is_admin: true }, error: null })
            .mockResolvedValueOnce({ data: { hospital_request: '새로운병원' }, error: null });

        const result = await (server.resolveHospitalRequest as any)({
            adminId: ADMIN_ID,
            targetUserId: USER_ID,
            hospitalId: 'korea-institute-radiological-medical-sciences',
        });

        expect(mockProfilesUpdate).toHaveBeenCalledWith({
            hospital_request: null,
            hospital_id: 'korea-institute-radiological-medical-sciences',
        });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: USER_ID,
                senderId: ADMIN_ID,
                type: 'system_notice',
                message: expect.stringContaining('한국원자력의학원'),
            }),
        );
        expect(result.data).toEqual({ success: true, hospitalId: 'korea-institute-radiological-medical-sciences' });
    });

    it('거절(hospitalId 없음) — hospital_request 만 비우고 소속은 건드리지 않음 + 알림', async () => {
        mockProfilesSelect
            .mockResolvedValueOnce({ data: { is_admin: true }, error: null })
            .mockResolvedValueOnce({ data: { hospital_request: '새로운병원' }, error: null });

        const result = await (server.resolveHospitalRequest as any)({ adminId: ADMIN_ID, targetUserId: USER_ID });

        expect(mockProfilesUpdate).toHaveBeenCalledWith({ hospital_request: null });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, message: expect.stringContaining('기타') }),
        );
        expect(result.data).toEqual({ success: true, hospitalId: null });
    });

    it('알림 실패는 처리 결과를 바꾸지 않는다', async () => {
        mockProfilesSelect
            .mockResolvedValueOnce({ data: { is_admin: true }, error: null })
            .mockResolvedValueOnce({ data: { hospital_request: '새로운병원' }, error: null });
        mockCreateNotification.mockRejectedValueOnce(new Error('push down'));

        const result = await (server.resolveHospitalRequest as any)({ adminId: ADMIN_ID, targetUserId: USER_ID });
        expect(result.data).toEqual({ success: true, hospitalId: null });
    });
});

describe('server.registerHospitalFromRequest', () => {
    const ADMIN_ID = '223e4567-e89b-12d3-a456-426614174000';
    beforeEach(() => {
        session.userId = ADMIN_ID;
    });

    it('관리자가 아니면 거부', async () => {
        mockProfilesSelect.mockResolvedValueOnce({ data: { is_admin: false }, error: null });
        await expect(
            (server.registerHospitalFromRequest as any)({
                adminId: ADMIN_ID,
                targetUserId: USER_ID,
                name: '테스트병원',
            }),
        ).rejects.toThrow('관리자 권한이 필요합니다.');
        expect(mockCustomUpsert).not.toHaveBeenCalled();
    });

    it('2자 미만·60자 초과 이름은 거부', async () => {
        await expect(
            (server.registerHospitalFromRequest as any)({ adminId: ADMIN_ID, targetUserId: USER_ID, name: '병' }),
        ).rejects.toThrow();
        await expect(
            (server.registerHospitalFromRequest as any)({
                adminId: ADMIN_ID,
                targetUserId: USER_ID,
                name: 'x'.repeat(61),
            }),
        ).rejects.toThrow();
    });

    it('새 이름 — hospitals_custom upsert(결정적 c- id) + 소속 변경 + 요청 비움 + 알림, created:true', async () => {
        mockProfilesSelect
            .mockResolvedValueOnce({ data: { is_admin: true }, error: null })
            .mockResolvedValueOnce({ data: { hospital_request: '테스트' }, error: null });

        const result = await (server.registerHospitalFromRequest as any)({
            adminId: ADMIN_ID,
            targetUserId: USER_ID,
            name: '테스트병원',
        });

        const [row, opts] = mockCustomUpsert.mock.calls[0];
        expect(row).toEqual(expect.objectContaining({ name: '테스트병원', created_by: ADMIN_ID }));
        expect(row.id).toMatch(/^c-[a-f0-9]{10}$/);
        expect(opts).toEqual(expect.objectContaining({ onConflict: 'id' }));
        expect(mockProfilesUpdate).toHaveBeenCalledWith({ hospital_request: null, hospital_id: row.id });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, message: expect.stringContaining('테스트병원') }),
        );
        expect(result.data).toEqual({ success: true, hospitalId: row.id, name: '테스트병원', created: true });
    });

    it('정적 목록과 표기만 다른 이름은 새로 만들지 않고 그 기관으로 합친다, created:false', async () => {
        mockProfilesSelect
            .mockResolvedValueOnce({ data: { is_admin: true }, error: null })
            .mockResolvedValueOnce({ data: { hospital_request: '한국 원자력 의학원' }, error: null });

        const result = await (server.registerHospitalFromRequest as any)({
            adminId: ADMIN_ID,
            targetUserId: USER_ID,
            name: '한국 원자력 의학원',
        });

        expect(mockCustomUpsert).not.toHaveBeenCalled();
        expect(mockProfilesUpdate).toHaveBeenCalledWith({
            hospital_request: null,
            hospital_id: 'korea-institute-radiological-medical-sciences',
        });
        expect(result.data).toEqual({
            success: true,
            hospitalId: 'korea-institute-radiological-medical-sciences',
            name: '한국원자력의학원',
            created: false,
        });
    });
});
