import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockAdminFrom = vi.fn();
const mockAdminUpdate = vi.fn();
const mockAdminEq = vi.fn();
const mockAdminSingle = vi.fn();

const mockSingle = vi.fn();

vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAnon: {
        from: (table: string) => {
            mockFrom(table);
            return {
                delete: () => {
                    mockDelete();
                    return {
                        eq: (col: string, val: string) => {
                            mockEq(col, val);
                            return Promise.resolve({ error: null });
                        },
                    };
                },
                insert: (data: unknown) => {
                    mockInsert(data);
                    return { select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) };
                },
                update: (data: unknown) => {
                    mockUpdate(data);
                    return {
                        eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
                    };
                },
            };
        },
    },
    supabaseAdmin: {
        from: (table: string) => {
            mockAdminFrom(table);
            return {
                select: (cols?: string) => ({
                    eq: (col: string, val: string) => ({
                        single: () => mockAdminSingle(table, col, val),
                    }),
                }),
                update: (data: unknown) => {
                    mockAdminUpdate(table, data);
                    return {
                        eq: (col: string, val: string) => {
                            mockAdminEq(table, col, val);
                            return Promise.resolve({ error: null });
                        },
                    };
                },
                insert: (data: unknown) => {
                    mockInsert(data);
                    return { select: () => ({ single: () => mockAdminSingle(table, 'insert', data) }) };
                },
            };
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
    ADMIN_EMAILS: ['admin@test.com'],
}));

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { server } from '../../../src/actions/index';

describe('server.actions', () => {
    it('필수 액션들이 export됨', () => {
        expect(server).toHaveProperty('saveFinding');
        expect(server).toHaveProperty('deleteFinding');
        expect(server).toHaveProperty('sendVerificationCode');
        expect(server).toHaveProperty('verifyEmailCode');
        expect(server).toHaveProperty('sendNotification');
        expect(server).toHaveProperty('sendFeedback');
        expect(server).toHaveProperty('approveVerification');
        expect(server).toHaveProperty('rejectVerification');
        expect(server).toHaveProperty('revokeVerification');
    });
});

describe('server.deleteFinding', () => {
    beforeEach(() => {
        mockFrom.mockClear();
        mockDelete.mockClear();
        mockEq.mockClear();
    });

    it('local- 접두사 id는 DB 삭제 없이 성공 반환', async () => {
        const action = server.deleteFinding as any;
        const result = await action({ id: 'local-xxx' });
        expect(result.data).toEqual({ success: true });
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('local- 아닌 id는 supabaseAnon.delete 호출', async () => {
        const action = server.deleteFinding as any;
        await action({ id: 'real-uuid' });
        expect(mockFrom).toHaveBeenCalledWith('findings');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'real-uuid');
    });
});

describe('server.saveFinding', () => {
    const baseInput = {
        title: '테스트',
        findingType: '지적' as const,
        tags: ['a'],
        year: '2024',
        description: '설명',
    };

    beforeEach(() => {
        mockInsert.mockClear();
        mockUpdate.mockClear();
    });

    it('id 없으면 insert 호출', async () => {
        await (server.saveFinding as any)(baseInput);
        expect(mockInsert).toHaveBeenCalled();
    });

    it('id가 local- 아닌 기존 id면 update 호출', async () => {
        await (server.saveFinding as any)({ ...baseInput, id: 'existing-id' });
        expect(mockUpdate).toHaveBeenCalled();
    });
});

describe('admin.verification', () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    const targetUserId = '123e4567-e89b-12d3-a456-426614174001';

    beforeEach(() => {
        mockAdminFrom.mockClear();
        mockAdminUpdate.mockClear();
        mockAdminEq.mockClear();
        mockAdminSingle.mockClear();
    });

    it('approveVerification: 관리자가 아니면 에러', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
        await expect((server.approveVerification as any)({ adminId, targetUserId })).rejects.toThrow(
            '관리자 권한이 필요합니다.',
        );
    });

    it('approveVerification: 관리자인 경우 성공 및 DB 업데이트', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
        const res = await (server.approveVerification as any)({ adminId, targetUserId });
        expect(res.data).toEqual({ success: true, message: '인증 승인이 완료되었습니다.' });
        expect(mockAdminUpdate).toHaveBeenCalledWith('profiles', { verification_status: 'verified' });
        expect(mockAdminUpdate).toHaveBeenCalledWith(
            'verification_requests',
            expect.objectContaining({
                verification_status: 'approved',
            }),
        );
    });

    it('rejectVerification: 반려 처리 확인', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
        const res = await (server.rejectVerification as any)({ adminId, targetUserId, reason: '탈락' });
        expect(res.data.success).toBe(true);
        expect(mockAdminUpdate).toHaveBeenCalledWith('profiles', { verification_status: 'rejected' });
        expect(mockAdminUpdate).toHaveBeenCalledWith(
            'verification_requests',
            expect.objectContaining({
                verification_status: 'rejected',
                reject_reason: '탈락',
            }),
        );
    });

    it('revokeVerification: 회수 처리 확인', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
        const res = await (server.revokeVerification as any)({ adminId, targetUserId });
        expect(res.data.success).toBe(true);
        expect(mockAdminUpdate).toHaveBeenCalledWith('profiles', { verification_status: 'temp_verified' });
        expect(mockAdminUpdate).toHaveBeenCalledWith(
            'verification_requests',
            expect.objectContaining({
                verification_status: 'pending',
            }),
        );
    });
});

describe('server.sendVerificationCode', () => {
    const email = 'user@test.com';
    const userId = '123e4567-e89b-12d3-a456-426614174001';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('성공 케이스: DB 저장 및 이메일 발송', async () => {
        const { sendVerificationEmail } = await import('../../../src/lib/email');
        (sendVerificationEmail as any).mockResolvedValue({ success: true, messageId: 'test-id' });

        mockAdminSingle.mockImplementation((table) => {
            if (table === 'email_verification_codes') return Promise.resolve({ data: { id: 'code-id' }, error: null });
            if (table === 'profiles') return Promise.resolve({ data: { real_name: '김테스트' }, error: null });
            return Promise.resolve({ data: null, error: null });
        });

        const res = await (server.sendVerificationCode as any)({ email, userId });

        expect(res.data.success).toBe(true);
        expect(mockAdminFrom).toHaveBeenCalledWith('email_verification_codes');
        expect(mockInsert).toHaveBeenCalled();
        expect(sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: email, userName: '김테스트' }));
    });

    it('이메일 발송 실패 시 에러 발생', async () => {
        const { sendVerificationEmail } = await import('../../../src/lib/email');
        (sendVerificationEmail as any).mockRejectedValue(new Error('SMTP Error'));

        mockAdminSingle.mockImplementation((table) => {
            if (table === 'email_verification_codes') return Promise.resolve({ data: { id: 'code-id' }, error: null });
            if (table === 'profiles') return Promise.resolve({ data: { real_name: '김테스트' }, error: null });
            return Promise.resolve({ data: null, error: null });
        });

        await expect((server.sendVerificationCode as any)({ email, userId })).rejects.toThrow('이메일 발송에 실패했습니다');
    });

    it('프로필 조회 실패 시 기본값(사용자)으로 발송', async () => {
        const { sendVerificationEmail } = await import('../../../src/lib/email');
        (sendVerificationEmail as any).mockResolvedValue({ success: true, messageId: 'test-id' });

        mockAdminSingle.mockImplementation((table) => {
            if (table === 'email_verification_codes') return Promise.resolve({ data: { id: 'code-id' }, error: null });
            if (table === 'profiles') return Promise.resolve({ data: null, error: null });
            return Promise.resolve({ data: null, error: null });
        });

        await (server.sendVerificationCode as any)({ email, userId });
        expect(sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({ userName: '사용자' }));
    });
});
