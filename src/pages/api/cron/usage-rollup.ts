export const prerender = false;

/**
 * GET /api/cron/usage-rollup — 사용성 집계 야간 롤업. 명세: .spec/src/pages/api/cron/usage-rollup.md
 *
 * Vercel Cron(vercel.json, 하루 1회)이 `Authorization: Bearer <CRON_SECRET>` 로 호출한다.
 * 관리자는 브라우저에서 수동 실행 가능(admin 쿠키). `?dry=1` 이면 계산만 하고 쓰지 않는다.
 *
 * 감시 크론(`/api/cron/watch`)과 **같은 비밀을 쓰되 경로는 따로** 둔다 — 한쪽이 실패해도
 * 다른 쪽은 돌아야 하고, 실패 원인도 섞이지 않는다.
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { createLogger } from '../../../lib/logger';
import { runUsageRollup } from '../../../lib/usage/rollup';

const logger = createLogger('api-cron-usage-rollup');

// Vercel 은 런타임 env 를 import.meta.env 에 인라인하지 않을 수 있어 process.env 로 폴백.
const CRON_SECRET =
    import.meta.env.CRON_SECRET || (typeof process !== 'undefined' ? process.env.CRON_SECRET : undefined);

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

function cronAuthorized(request: Request): boolean {
    if (!CRON_SECRET) return false;
    const header = request.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    return token.length > 0 && timingSafeEqual(token, CRON_SECRET);
}

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
    if (!cronAuthorized(request)) {
        const supabase = createSupabaseServerClient(request, cookies);
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return jsonResponse({ error: '인증이 필요합니다.' }, 401);
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (!profile?.is_admin) return jsonResponse({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const dry = url.searchParams.get('dry') === '1';
    const startedAt = new Date();
    const result = await runUsageRollup({ now: startedAt, dry });

    logger.info('사용성 롤업', {
        dry,
        scanned: result.scannedRows,
        daily: result.dailyRows,
        active: result.activeRows,
        pruned: result.pruned,
        ...(result.error ? { error: result.error } : {}),
    });

    // 실패해도 200 으로 보고한다 — 크론 재시도가 같은 실패를 반복하는 것보다 응답을 읽는 편이 낫다.
    return jsonResponse(
        {
            ok: !result.error,
            startedAt: startedAt.toISOString(),
            durationMs: Date.now() - startedAt.getTime(),
            ...result,
        },
        200,
    );
};
