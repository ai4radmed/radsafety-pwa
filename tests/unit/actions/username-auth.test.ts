import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stage 1-A (privacy_redesign_plan.md 1단계) — signUpWithUsername / signInWithUsername /
// claimUsername 단위 테스트. supabase-server 는 이 파일 전용으로 별도 모의한다
// (tests/unit/actions/index.test.ts 의 공유 모의는 auth.admin.* 를 다루지 않음).

const mockProfilesSelect = vi.fn();
const mockProfilesInsert = vi.fn();
const mockProfilesUpdate = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockAdminDeleteUser = vi.fn();
const mockAdminGetUserById = vi.fn();
const mockAdminUpdateUserById = vi.fn();

vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAnon: {},
    supabaseAdmin: {
        from: (table: string) => {
            if (table !== 'profiles') throw new Error(`unexpected table: ${table}`);
            return {
                select: (_cols?: string) => ({
                    eq: (_col: string, val: string) => ({
                        maybeSingle: () => mockProfilesSelect(val),
                    }),
                }),
                insert: (data: unknown) => {
                    mockProfilesInsert(data);
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
    mockProfilesInsert.mockReset();
    mockProfilesUpdate.mockReset();
    mockAdminCreateUser.mockReset();
    mockAdminDeleteUser.mockReset();
    mockAdminGetUserById.mockReset();
    mockAdminUpdateUserById.mockReset();
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

    it('정상 가입 — 가짜 이메일로 auth 계정 생성 후 profiles insert', async () => {
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
        expect(mockProfilesInsert).toHaveBeenCalledWith(
            expect.objectContaining({ id: USER_ID, username: 'gildong', login_email: null, nickname: null }),
        );
        expect(result.data).toEqual({ success: true, email: 'gildong@radsafety.invalid' });
    });

    it('auth 계정 생성 실패 시 profiles insert 호출 안 됨', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: null, error: { message: 'boom' } });

        await expect(
            (server.signUpWithUsername as any)({ username: 'gildong', password: 'longenough1' }),
        ).rejects.toThrow('boom');
        expect(mockProfilesInsert).not.toHaveBeenCalled();
    });

    it('profiles insert 실패 시 방금 만든 auth 계정을 롤백(삭제)', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminCreateUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
        // insert 자체는 항상 { error: null } 을 주는 공용 모의라, 이 케이스만 따로 override.
        const failingInsert = vi.fn().mockResolvedValueOnce({ error: { message: 'db down' } });
        // supabase-server 모의의 from().insert 를 이 테스트에서만 바꿔치기.
        const supa = await import('../../../src/lib/supabase-server');
        const original = (supa.supabaseAdmin as any).from;
        (supa.supabaseAdmin as any).from = (table: string) => {
            const base = original(table);
            return { ...base, insert: failingInsert };
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

    it('정상 — auth.users.email 교체 + profiles.username/login_email/nickname 갱신', async () => {
        mockProfilesSelect.mockResolvedValue({ data: null, error: null });
        mockAdminUpdateUserById.mockResolvedValue({ error: null });

        await (server.claimUsername as any)({ userId: USER_ID, username: 'Gildong' });

        expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
            USER_ID,
            expect.objectContaining({ email: 'gildong@radsafety.invalid', email_confirm: true }),
        );
        expect(mockProfilesUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ username: 'gildong', login_email: null, nickname: null }),
        );
    });
});
