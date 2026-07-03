export const prerender = false;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { isAdmin } from '../../config/auth';
import { runChecks, type CheckResult } from '../../lib/health-checks';
import { APP_VERSION, APP_RELEASE_DATE } from '../../consts';
import { createLogger } from '../../lib/logger';

const logger = createLogger('api-health');

// 핵심 층 — 실패 시 down(503). 그 외 실패는 degraded(200).
const CORE_CHECKS = new Set(['app-host', 'config', 'db-ping']);

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
    const deep = url.searchParams.get('deep') === '1';

    // deep 은 admin 게이트(명세 규칙 3). 미인증 401 / 비-admin 403 후 종료(deep 미실행).
    if (deep) {
        const supabase = createSupabaseServerClient(request, cookies);
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonResponse({ error: '로그인이 필요합니다.' }, 401);
        }
        if (!isAdmin(user.email ?? '')) {
            return jsonResponse({ error: '관리자 권한이 필요합니다.' }, 403);
        }
    }

    const mode = deep ? 'deep' : 'shallow';
    const checks: CheckResult[] = await runChecks(mode);

    // deep — 콘텐츠 컬렉션 로드(astro:content 컨텍스트가 필요해 여기서 점검).
    if (deep) {
        const start = Date.now();
        try {
            const items = await getCollection('inspection_prep');
            checks.push({
                name: 'content',
                layer: 5,
                ok: true,
                ms: Date.now() - start,
                detail: `${items.length} docs`,
            });
        } catch {
            checks.push({
                name: 'content',
                layer: 5,
                ok: false,
                ms: Date.now() - start,
                detail: 'content load failed',
            });
        }
    }

    // status 집계: 핵심 실패 → down, 그 외 실패 → degraded, 전부 ok → ok.
    const coreDown = checks.some((c) => CORE_CHECKS.has(c.name) && !c.ok);
    const anyDown = checks.some((c) => !c.ok);
    const status = coreDown ? 'down' : anyDown ? 'degraded' : 'ok';

    if (status !== 'ok') {
        logger.warn('헬스체크 이상', { status, mode, failed: checks.filter((c) => !c.ok).map((c) => c.name) });
    }

    return jsonResponse(
        {
            status,
            mode,
            version: APP_VERSION,
            releaseDate: APP_RELEASE_DATE,
            ts: new Date().toISOString(),
            checks,
        },
        status === 'down' ? 503 : 200,
    );
};
