export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '../../../lib/supabase-server';
import { createLogger } from '../../../lib/logger';

const logger = createLogger('push-unsubscribe');

export const DELETE: APIRoute = async ({ request, cookies }) => {
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
        const { endpoint } = body;

        if (!endpoint) {
            return new Response(JSON.stringify({ error: 'endpoint가 필요합니다.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 본인 구독 삭제
        const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', endpoint);

        if (error) {
            logger.error('푸시 구독 삭제 실패', { error, userId: user.id });
            return new Response(JSON.stringify({ error: '구독 해제에 실패했습니다.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        logger.info('푸시 구독 해제 완료', { userId: user.id });
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        logger.error('푸시 구독 해제 API 오류', { err });
        return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
