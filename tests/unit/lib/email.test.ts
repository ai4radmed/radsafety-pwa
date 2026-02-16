import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendVerificationEmail, sendFeedbackEmail } from '../../../src/lib/email';

describe('sendVerificationEmail', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('API 키 없으면 개발모드로 성공 반환', async () => {
        const result = await sendVerificationEmail({
            to: 'test@example.com',
            code: '123456',
            userName: '테스터',
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('dev-mode');
    });
});

describe('sendFeedbackEmail', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('API 키 없으면 개발모드로 성공 반환', async () => {
        const result = await sendFeedbackEmail({
            adminEmails: ['admin@example.com'],
            userName: '테스터',
            userEmail: 'test@example.com',
            title: '테스트 제목',
            message: '테스트 메시지입니다.',
            feedbackId: 'fb-123',
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('dev-mode');
    });

    it('첨부파일이 있어도 개발모드에서 정상 동작', async () => {
        const result = await sendFeedbackEmail({
            adminEmails: ['admin@example.com'],
            userName: '테스터',
            userEmail: 'test@example.com',
            title: '첨부파일 테스트',
            message: '첨부파일이 있는 피드백입니다.',
            feedbackId: 'fb-456',
            attachments: [{ filename: 'report.pdf', storage_path: '/uploads/report.pdf', size: 1024 }],
        });

        expect(result.success).toBe(true);
    });
});
