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

import {
    getUserIdsByFilter,
    createVerificationApprovedNotification,
    createVerificationRejectedNotification,
    createBulkNotifications,
} from '../../../src/lib/notification-helper';

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

describe('createVerificationApprovedNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'notif-1' },
                error: null,
            }),
        });
    });

    it('createNotification을 호출하여 verification_approved 타입 알림 생성', async () => {
        const result = await createVerificationApprovedNotification('user-1', 'admin-1', '대한핵의학회', '의사');

        expect(result).toBeDefined();
        expect(result.id).toBe('notif-1');
        expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
});

describe('createVerificationRejectedNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'notif-reject-1' },
                error: null,
            }),
        });
    });

    it('createNotification을 호출하여 verification_rejected 타입 알림 생성', async () => {
        const result = await createVerificationRejectedNotification('user-1', 'admin-1', '서류 부족');

        expect(result).toBeDefined();
        expect(result.id).toBe('notif-reject-1');
        expect(mockFrom).toHaveBeenCalledWith('notifications');
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
