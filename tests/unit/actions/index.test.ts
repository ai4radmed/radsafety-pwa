import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

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
    supabaseAdmin: {},
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
    createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import { server } from '../../../src/actions/index';

describe('server.actions', () => {
    it('saveFinding, deleteFinding 등 필수 액션이 export됨', () => {
        expect(server).toHaveProperty('saveFinding');
        expect(server).toHaveProperty('deleteFinding');
        expect(server).toHaveProperty('sendVerificationCode');
        expect(server).toHaveProperty('verifyEmailCode');
        expect(server).toHaveProperty('sendNotification');
        expect(server).toHaveProperty('sendFeedback');
    });
});

describe('server.deleteFinding', () => {
    beforeEach(() => {
        mockFrom.mockClear();
        mockDelete.mockClear();
        mockEq.mockClear();
    });

    it('local- 접두사 id는 DB 삭제 없이 성공 반환', async () => {
        const action = server.deleteFinding as (input: { id: string }) => Promise<{ data?: unknown }>;
        const result = await action({ id: 'local-xxx' });
        expect(result).toBeDefined();
        const data = 'data' in result ? result.data : result;
        expect(data).toEqual({ success: true });
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('local- 아닌 id는 supabaseAnon.delete 호출', async () => {
        const action = server.deleteFinding as (input: { id: string }) => Promise<unknown>;
        await action({ id: 'real-uuid-123' });
        expect(mockFrom).toHaveBeenCalledWith('findings');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'real-uuid-123');
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
        const action = server.saveFinding as any;
        await action(baseInput);
        expect(mockInsert).toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('id가 local-로 시작하면 insert 호출', async () => {
        const action = server.saveFinding as any;
        await action({ ...baseInput, id: 'local-xxx' });
        expect(mockInsert).toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('id가 local- 아닌 기존 id면 update 호출', async () => {
        const action = server.saveFinding as any;
        await action({ ...baseInput, id: 'existing-uuid' });
        expect(mockUpdate).toHaveBeenCalled();
        expect(mockInsert).not.toHaveBeenCalled();
    });
});
