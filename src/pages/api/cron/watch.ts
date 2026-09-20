export const prerender = false;

/**
 * GET /api/cron/watch — 외부 자원(KINS RASIS) 갱신 감시. 명세: .spec/src/pages/api/cron/watch.md
 *
 * Vercel Cron(vercel.json, 하루 1회)이 `Authorization: Bearer <CRON_SECRET>` 로 호출한다.
 * 관리자는 브라우저에서 수동 실행 가능(admin 쿠키). `?dry=1` 이면 저장·알림 없이 diff 만 보여 준다.
 * 소스는 순서대로 돌고 하나가 실패해도 나머지는 계속된다(엔진이 throw 하지 않음).
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { createLogger } from '../../../lib/logger';
import { WATCH_SOURCES, runSource, notifyWatchResults, supabaseWatchStore } from '../../../lib/watch';
import type { SourceRunResult } from '../../../lib/watch';

const logger = createLogger('api-cron-watch');

// Vercel 은 런타임 env 를 import.meta.env 에 인라인하지 않을 수 있어 process.env 로 폴백(health.ts 와 동일).
const CRON_SECRET =
    import.meta.env.CRON_SECRET || (typeof process !== 'undefined' ? process.env.CRON_SECRET : undefined);

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

// Vercel Cron 은 CRON_SECRET 이 설정돼 있으면 Authorization: Bearer <secret> 를 붙여 호출한다.
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

/** 응답에는 건수·제목만 — 지문·메타는 뺀다(로그 가독성). */
function summarize(r: SourceRunResult) {
    return {
        source: r.source,
        status: r.status,
        count: r.count,
        added: r.added.map((i) => i.title),
        changed: r.changed.map((i) => i.title),
        removed: r.removed,
        consecutiveFailures: r.consecutiveFailures,
        ...(r.error ? { error: r.error } : {}),
    };
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
    const results: SourceRunResult[] = [];

    for (const source of WATCH_SOURCES) {
        results.push(await runSource(source, supabaseWatchStore, { persist: !dry, now: startedAt }));
    }

    const delivery = dry ? { memberNotified: 0, telegram: false } : await notifyWatchResults(WATCH_SOURCES, results);

    const allFailed = results.every((r) => r.status === 'error' || r.status === 'suspicious');
    if (allFailed) logger.warn('감시 전 소스 실패', { results: results.map(summarize) });

    return jsonResponse(
        {
            ok: !allFailed,
            dry,
            ts: startedAt.toISOString(),
            ms: Date.now() - startedAt.getTime(),
            results: results.map(summarize),
            delivery,
        },
        allFailed ? 502 : 200,
    );
};
