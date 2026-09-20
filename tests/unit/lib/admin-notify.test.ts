import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const sendMock = vi.fn();
vi.mock('resend', () => ({
    Resend: class {
        emails = { send: (...args: unknown[]) => sendMock(...args) };
    },
}));

import { adminNotifyRecipients, sendAdminNotice } from '../../../src/lib/admin-notify';

beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: 'x' }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('lib/admin-notify 수신자', () => {
    it('ADMIN_NOTIFY_EMAILS 가 우선, 없으면 PUBLIC_ADMIN_EMAILS 로 폴백', () => {
        vi.stubEnv('ADMIN_NOTIFY_EMAILS', '');
        vi.stubEnv('PUBLIC_ADMIN_EMAILS', 'a@x.com, b@x.com');
        expect(adminNotifyRecipients()).toEqual(['a@x.com', 'b@x.com']);

        vi.stubEnv('ADMIN_NOTIFY_EMAILS', 'only@x.com');
        expect(adminNotifyRecipients()).toEqual(['only@x.com']);
    });

    it('둘 다 비어 있으면 빈 목록', () => {
        vi.stubEnv('ADMIN_NOTIFY_EMAILS', '');
        vi.stubEnv('PUBLIC_ADMIN_EMAILS', '');
        expect(adminNotifyRecipients()).toEqual([]);
    });
});

describe('lib/admin-notify 발송', () => {
    const notice = {
        subject: '새 가입 신청 1건',
        lines: ['아이디 <strong>@gildong</strong> · 아이디 로그인'],
        linkPath: '/admin/member-approval',
        linkLabel: '가입 승인 검토',
    };

    it('수신자가 있으면 [RadSafety] 접두 제목으로 발송하고 링크를 절대 URL 로 넣는다', async () => {
        vi.stubEnv('ADMIN_NOTIFY_EMAILS', 'admin@x.com');
        vi.stubEnv('RESEND_API_KEY', 're_test');
        const n = await sendAdminNotice(notice);
        expect(n).toBe(1);
        const payload = sendMock.mock.calls[0][0];
        expect(payload.to).toEqual(['admin@x.com']);
        expect(payload.subject).toBe('[RadSafety] 새 가입 신청 1건');
        expect(payload.html).toContain('https://radsafety.kr/admin/member-approval');
        expect(payload.text).toContain('https://radsafety.kr/admin/member-approval');
    });

    it('수신자 미설정·API 키 미설정이면 조용히 생략(0 반환, 발송 없음)', async () => {
        vi.stubEnv('ADMIN_NOTIFY_EMAILS', '');
        vi.stubEnv('PUBLIC_ADMIN_EMAILS', '');
        vi.stubEnv('RESEND_API_KEY', 're_test');
        expect(await sendAdminNotice(notice)).toBe(0);

        vi.stubEnv('ADMIN_NOTIFY_EMAILS', 'admin@x.com');
        vi.stubEnv('RESEND_API_KEY', '');
        expect(await sendAdminNotice(notice)).toBe(0);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('발송 실패는 throw 하지 않는다 — 업무 처리를 되돌리지 않는다', async () => {
        vi.stubEnv('ADMIN_NOTIFY_EMAILS', 'admin@x.com');
        vi.stubEnv('RESEND_API_KEY', 're_test');
        sendMock.mockResolvedValue({ data: null, error: { message: 'rate limited' } });
        expect(await sendAdminNotice(notice)).toBe(0);
        sendMock.mockRejectedValue(new Error('network'));
        expect(await sendAdminNotice(notice)).toBe(0);
    });
});

describe('관리자 메일이 붙은 이벤트 (소스 계약)', () => {
    const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');
    const IDX = read('src/actions/index.ts');
    const PROPOSALS = read('src/actions/proposals.ts');

    it('새 가입 신청 — 앱 알림 + 메일(그전까지 알림 자체가 없었다)', () => {
        expect(IDX).toMatch(/async function notifyAdminsOfSignup/);
        expect(IDX).toMatch(/새 가입 신청 1건/);
        // 아이디 가입과 카카오 첫 접속 게이트 양쪽에서 호출
        expect(IDX).toMatch(/notifyAdminsOfSignup\(username, 'email'\)/);
        expect(IDX).toMatch(/notifyAdminsOfSignup\(username, 'kakao'\)/);
        // 기존 active 회원의 아이디 전환에서는 알리지 않는다
        expect(IDX).toMatch(/currentStatus === 'pending'/);
    });

    it('기관 등록 요청·검토 대기 제출물에도 메일', () => {
        expect(IDX).toMatch(/회원기관 등록 요청 1건/);
        expect(IDX).toMatch(/검토 대기 제출물 1건/);
    });

    it('제안 메일에는 본문·작성자를 싣지 않는다(익명 채널)', () => {
        expect(PROPOSALS).toMatch(/새 제도 개선 제안 1건/);
        const start = PROPOSALS.indexOf('sendAdminNotice(');
        const block = PROPOSALS.slice(start, start + 400);
        expect(block).not.toMatch(/\bbody\b/);
        expect(block).toMatch(/내용은 관리자 화면에서 확인하세요/);
    });
});
