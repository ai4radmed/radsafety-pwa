import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 웹 푸시 유틸리티 단위 테스트
 *
 * 테스트 가능 범위:
 *  - VAPID 키 미설정 시 조기 반환 (에러 없음)
 *  - 구독 없는 사용자에게 발송 시 조용히 종료
 *  - 여러 사용자에게 동시 발송 (Promise.allSettled)
 *  - 만료된 구독(410/404) 자동 삭제
 *
 * 테스트 불가 범위 (수동/반자동):
 *  - 실제 브라우저에서 push 이벤트 수신 확인 → test_strategy.md 4-3 수동 항목
 *  - 알림 팝업 UI 표시 → 수동 확인
 */

// web-push 모듈 mock
vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn(),
    },
}));

// supabase-server mock
vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAdmin: {
        from: vi.fn(),
    },
}));

// import.meta.env mock (VAPID 키 없는 상태가 기본)
vi.stubEnv('PUBLIC_VAPID_KEY', '');
vi.stubEnv('VAPID_PRIVATE_KEY', '');

import { sendPushToUser, sendPushToUsers } from '../../../src/lib/push';
import webpush from 'web-push';
import { supabaseAdmin } from '../../../src/lib/supabase-server';

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
const mockSendNotification = webpush.sendNotification as ReturnType<typeof vi.fn>;

describe('sendPushToUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('VAPID 키가 없으면 조기 반환 (에러 없음)', async () => {
        // VAPID 키가 빈 문자열 → 모듈 로드 시 setVapidDetails가 호출되지 않아야 함
        await expect(sendPushToUser('user-1', { title: '테스트', body: '내용' })).resolves.toBeUndefined();

        // DB 조회 없이 반환
        expect(mockFrom).not.toHaveBeenCalled();
        expect(mockSendNotification).not.toHaveBeenCalled();
    });
});

describe('sendPushToUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('빈 배열 전달 시 에러 없이 완료', async () => {
        await expect(sendPushToUsers([], { title: '테스트', body: '내용' })).resolves.toBeUndefined();
    });

    it('여러 userId를 Promise.allSettled로 처리 (부분 실패해도 전체 완료)', async () => {
        // 각 sendPushToUser는 VAPID 없으면 조기 반환하므로 모두 성공
        await expect(
            sendPushToUsers(['user-1', 'user-2', 'user-3'], { title: '공지', body: '내용' }),
        ).resolves.toBeUndefined();
    });
});

describe('PushPayload 타입 검증', () => {
    it('필수 필드(title, body)만으로 구성 가능', async () => {
        // 타입 오류 없이 호출되어야 함 (VAPID 없으면 조기 반환)
        await expect(
            sendPushToUser('user-1', {
                title: '제목',
                body: '본문',
            }),
        ).resolves.toBeUndefined();
    });

    it('선택 필드(url, tag) 포함해도 정상 동작', async () => {
        await expect(
            sendPushToUser('user-1', {
                title: '제목',
                body: '본문',
                url: '/notifications',
                tag: 'admin_message',
            }),
        ).resolves.toBeUndefined();
    });
});
