export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '../../../lib/supabase-server';
import { createLogger } from '../../../lib/logger';

const logger = createLogger('push-subscribe');

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // 로그인 확인
        const supabase = createSupabaseServerClient(request, cookies);
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { endpoint, p256dh, auth, userAgent } = body;

        if (!endpoint || !p256dh || !auth) {
            return new Response(JSON.stringify({ error: '구독 정보가 올바르지 않습니다.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // upsert: 같은 endpoint가 있으면 user_id 갱신, 없으면 삽입
        const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
            {
                user_id: user.id,
                endpoint,
                p256dh,
                auth,
                user_agent: userAgent || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' },
        );

        if (error) {
            logger.error('푸시 구독 저장 실패', { error, userId: user.id });
            return new Response(JSON.stringify({ error: '구독 저장에 실패했습니다.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        logger.info('푸시 구독 저장 완료', { userId: user.id });
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        logger.error('푸시 구독 API 오류', { err });
        return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
