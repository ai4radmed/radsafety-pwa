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
                select: (_cols?: string) => ({
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
        expect(server).toHaveProperty('sendNotification');
        expect(server).toHaveProperty('sendFeedback');
        expect(server).toHaveProperty('approvePendingMember');
        expect(server).toHaveProperty('rejectPendingMember');
        expect(server).toHaveProperty('resolveHospitalRequest');
        expect(server).toHaveProperty('registerHospitalFromRequest');
        expect(server).toHaveProperty('updateAffiliation');
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

describe('admin.memberApproval (Phase 3)', () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    const targetUserId = '123e4567-e89b-12d3-a456-426614174001';

    beforeEach(() => {
        mockAdminFrom.mockClear();
        mockAdminUpdate.mockClear();
        mockAdminEq.mockClear();
        mockAdminSingle.mockClear();
    });

    it('필수 액션들이 export됨', () => {
        expect(server).toHaveProperty('approvePendingMember');
        expect(server).toHaveProperty('rejectPendingMember');
    });

    it('approvePendingMember: 관리자가 아니면 에러', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
        await expect((server.approvePendingMember as any)({ adminId, targetUserId })).rejects.toThrow(
            '관리자 권한이 필요합니다.',
        );
    });

    it('approvePendingMember: 관리자인 경우 status를 active로 변경', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
        const res = await (server.approvePendingMember as any)({ adminId, targetUserId });
        expect(res.data).toEqual({ success: true });
        expect(mockAdminUpdate).toHaveBeenCalledWith('profiles', { status: 'active' });
        expect(mockAdminEq).toHaveBeenCalledWith('profiles', 'id', targetUserId);
    });

    it('rejectPendingMember: 관리자가 아니면 에러', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
        await expect((server.rejectPendingMember as any)({ adminId, targetUserId })).rejects.toThrow(
            '관리자 권한이 필요합니다.',
        );
    });

    it('rejectPendingMember: 관리자인 경우 status를 banned로 변경', async () => {
        mockAdminSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
        const res = await (server.rejectPendingMember as any)({ adminId, targetUserId });
        expect(res.data).toEqual({ success: true });
        expect(mockAdminUpdate).toHaveBeenCalledWith('profiles', { status: 'banned' });
        expect(mockAdminEq).toHaveBeenCalledWith('profiles', 'id', targetUserId);
    });
});
