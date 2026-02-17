/**
 * 웹 푸시 발송 유틸리티
 * web-push 라이브러리를 사용해 서버에서 푸시 메시지를 전송합니다.
 */

import webpush from 'web-push';
import { supabaseAdmin } from './supabase-server';
import { createLogger } from './logger';

const logger = createLogger('push');

// VAPID 설정 (환경변수)
const VAPID_PUBLIC_KEY = import.meta.env.PUBLIC_VAPID_KEY;
const VAPID_PRIVATE_KEY = import.meta.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = import.meta.env.VAPID_EMAIL || 'mailto:noreply@radsafety.kr';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
}

/**
 * 특정 사용자의 모든 기기에 푸시 알림 발송
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        logger.error('VAPID 키가 설정되지 않았습니다. 웹 푸시를 발송할 수 없습니다.');
        return;
    }

    // 해당 사용자의 구독 목록 조회
    const { data: subscriptions, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        logger.error('구독 조회 실패', { error, userId });
        return;
    }

    if (!subscriptions || subscriptions.length === 0) {
        logger.info('푸시 구독 없음 (알림만 DB 저장)', { userId });
        return;
    }

    const message = JSON.stringify(payload);
    const expiredEndpoints: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    message,
                    { TTL: 86400 }, // 24시간 TTL
                );
                logger.info('푸시 발송 성공', { userId, endpoint: sub.endpoint.slice(0, 40) });
            } catch (err: any) {
                // 410 Gone / 404 = 구독 만료 → DB에서 삭제
                if (err.statusCode === 410 || err.statusCode === 404) {
                    expiredEndpoints.push(sub.endpoint);
                    logger.info('만료된 구독 삭제 예정', { endpoint: sub.endpoint.slice(0, 40) });
                } else {
                    logger.error('푸시 발송 실패', { err: err.message, userId });
                }
            }
        }),
    );

    // 만료된 구독 정리
    if (expiredEndpoints.length > 0) {
        await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }
}

/**
 * 여러 사용자에게 동시 발송
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}
