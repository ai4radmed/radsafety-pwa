import { describe, it, expect, vi, beforeEach } from 'vitest';

// resend 모듈을 모킹 — 실제 HTTP 요청 차단
const mockSend = vi.fn().mockResolvedValue({ data: { id: 'mock-message-id' }, error: null });

vi.mock('resend', () => {
    return {
        Resend: class MockResend {
            emails = { send: mockSend };
            constructor(_apiKey: string) {}
        },
    };
});

import { sendVerificationEmail, sendFeedbackEmail } from '../../../src/lib/email';

describe('sendVerificationEmail', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('API 키 없으면 개발모드로 성공 반환', async () => {
        vi.stubEnv('RESEND_API_KEY', '');

        const result = await sendVerificationEmail({
            to: 'test@example.com',
            code: '123456',
            userName: '테스터',
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('dev-mode');
    });

    it('API 키 있으면 resend를 통해 이메일 발송', async () => {
        vi.stubEnv('RESEND_API_KEY', 're_test_key_12345');

        const result = await sendVerificationEmail({
            to: 'test@example.com',
            code: '654321',
            userName: '테스터',
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('mock-message-id');
    });
});

describe('sendFeedbackEmail', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('API 키 없으면 개발모드로 성공 반환', async () => {
        vi.stubEnv('RESEND_API_KEY', '');

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
        vi.stubEnv('RESEND_API_KEY', '');

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

    it('API 키 있으면 resend를 통해 피드백 이메일 발송', async () => {
        vi.stubEnv('RESEND_API_KEY', 're_test_key_12345');

        const result = await sendFeedbackEmail({
            adminEmails: ['admin@example.com'],
            userName: '테스터',
            userEmail: 'test@example.com',
            title: '테스트 피드백',
            message: '정상 발송 확인용 메시지',
            feedbackId: 'fb-789',
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('mock-message-id');
    });
});
