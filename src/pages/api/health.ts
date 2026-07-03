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

// deep 머신 인증 토큰 — Vercel 은 런타임 env 를 import.meta.env 에 인라인하지 않을 수 있어
// process.env 로 폴백(VERCEL_REGION 과 동일 이유). 미설정이면 머신 경로 비활성(admin 쿠키만).
const HEALTH_CHECK_TOKEN =
    import.meta.env.HEALTH_CHECK_TOKEN || (typeof process !== 'undefined' ? process.env.HEALTH_CHECK_TOKEN : undefined);

// 상수시간 문자열 비교(타이밍 누출 최소화). 길이 불일치는 즉시 false.
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

// x-health-token 헤더가 설정된 HEALTH_CHECK_TOKEN 과 일치하면 deep 허용(무인 모니터 경로).
// 토큰 미설정 시 항상 false → admin 쿠키 게이트로 폴백.
function machineAuthorized(request: Request): boolean {
    if (!HEALTH_CHECK_TOKEN) return false;
    const provided = request.headers.get('x-health-token');
    return typeof provided === 'string' && provided.length > 0 && timingSafeEqual(provided, HEALTH_CHECK_TOKEN);
}

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

    // deep 은 인증 게이트(명세 규칙 3): ① 머신 토큰(x-health-token) 또는 ② admin 쿠키.
    // 토큰 경로가 통과하면 쿠키 검사를 건너뛴다(무인 모니터). 둘 다 실패면 401/403 후 종료(deep 미실행).
    if (deep && !machineAuthorized(request)) {
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
