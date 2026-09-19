import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAdmin: {
        from: (...args: unknown[]) => mockFrom(...args),
    },
}));

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

vi.mock('../../../src/lib/push', () => ({
    sendPushToUser: vi.fn().mockResolvedValue(undefined),
    sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}));

import { getUserIdsByFilter, createBulkNotifications } from '../../../src/lib/notification-helper';

describe('getUserIdsByFilter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('targetType specific이고 specificUserId 있으면 해당 ID 배열 반환', async () => {
        const result = await getUserIdsByFilter({
            targetType: 'specific',
            specificUserId: 'user-123',
        });

        expect(result).toEqual(['user-123']);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('targetType all이면 profiles select 호출', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                data: [{ id: 'u1' }, { id: 'u2' }],
                error: null,
            }),
            eq: vi.fn().mockReturnThis(),
        });

        const result = await getUserIdsByFilter({ targetType: 'all' });

        expect(mockFrom).toHaveBeenCalledWith('profiles');
        expect(result).toEqual(['u1', 'u2']);
    });
});

describe('createBulkNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue({
                data: [{ id: 'n1' }, { id: 'n2' }],
                error: null,
            }),
        });
    });

    it('여러 userId에 대해 insert 호출', async () => {
        const result = await createBulkNotifications(['u1', 'u2'], {
            senderId: 'admin-1',
            type: 'announcement',
            title: '공지',
            message: '내용',
        });

        expect(result).toHaveLength(2);
        expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
});
