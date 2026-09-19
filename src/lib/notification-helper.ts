/**
 * 알림 생성 헬퍼 함수
 *
 * 다양한 타입의 알림을 자동으로 생성합니다.
 */

import { supabaseAdmin } from './supabase-server';
import { createLogger } from './logger';
import { sendPushToUser, sendPushToUsers } from './push';

const logger = createLogger('notification');

export interface NotificationData {
    type: 'verification_approved' | 'verification_rejected' | 'admin_message' | 'system_notice' | 'announcement';
    userId: string;
    senderId?: string | null;
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    link?: string;
    actionLabel?: string;
    actionUrl?: string;
    expiresInDays?: number;
    metadata?: Record<string, any>;
}

/**
 * 알림 생성
 */
export async function createNotification(data: NotificationData) {
    const {
        type,
        userId,
        senderId = null,
        title,
        message,
        priority = 'normal',
        link = null,
        actionLabel = null,
        actionUrl = null,
        expiresInDays = 30,
        metadata = null,
    } = data;

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const notification = {
        user_id: userId,
        sender_id: senderId,
        type,
        priority,
        title,
        message,
        link,
        action_label: actionLabel,
        action_url: actionUrl,
        expires_at: expiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null,
        is_read: false,
        created_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabaseAdmin.from('notifications').insert(notification).select().single();

    if (error) {
        logger.error('알림 생성 실패', { error, type, userId });
        throw error;
    }

    logger.info('알림 생성 완료', { id: result.id, type, userId });

    // 웹 푸시 발송 (실패해도 알림 생성은 완료된 것으로 처리)
    sendPushToUser(userId, {
        title,
        body: message,
        url: link || '/notifications',
        tag: type,
    }).catch((err) => logger.error('웹 푸시 발송 오류', { err }));

    return result;
}

/**
 * 대량 알림 생성 (여러 사용자에게 동일한 메시지)
 */
export async function createBulkNotifications(userIds: string[], data: Omit<NotificationData, 'userId'>) {
    const notifications = userIds.map((userId) => ({
        user_id: userId,
        sender_id: data.senderId || null,
        type: data.type,
        priority: data.priority || 'normal',
        title: data.title,
        message: data.message,
        link: data.link || null,
        action_label: data.actionLabel || null,
        action_url: data.actionUrl || null,
        expires_at: data.expiresInDays
            ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        is_read: false,
        created_at: new Date().toISOString(),
    }));

    const { data: result, error } = await supabaseAdmin.from('notifications').insert(notifications).select();

    if (error) {
        logger.error('대량 알림 생성 실패', { error, count: userIds.length });
        throw error;
    }

    logger.info('대량 알림 생성 완료', { count: result.length });

    // 웹 푸시 발송 (실패해도 알림 생성은 완료된 것으로 처리)
    sendPushToUsers(userIds, {
        title: data.title,
        body: data.message,
        url: data.link || '/notifications',
        tag: data.type,
    }).catch((err) => logger.error('대량 웹 푸시 발송 오류', { err }));

    return result;
}

/**
 * 사용자 필터링 조건에 따라 사용자 ID 목록 가져오기
 */
export async function getUserIdsByFilter(filter: {
    targetType: 'all' | 'provider' | 'specific';
    provider?: 'kakao' | 'email';
    specificUserId?: string;
}) {
    const { targetType, provider, specificUserId } = filter;

    // 특정 사용자 지정
    if (targetType === 'specific' && specificUserId) {
        return [specificUserId];
    }

    let query = supabaseAdmin.from('profiles').select('id');

    // 로그인 방법에 따른 필터
    if (targetType === 'provider' && provider) {
        query = query.eq('provider', provider);
    }

    // 전체 사용자는 필터 없음 (all)

    const { data, error } = await query;

    if (error) {
        logger.error('사용자 필터 조회 실패', { error, filter });
        throw error;
    }

    return data.map((user) => user.id);
}
