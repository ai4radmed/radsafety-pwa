import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { recordUsage } from '../../lib/usage/record';

export const prerender = false;

const MAX_BATCH = 20; // 클라이언트도 같은 값으로 자른다
const MAX_BODY_BYTES = 16 * 1024;
const MAX_BACKDATE_MS = 7 * 24 * 60 * 60 * 1000; // 오프라인 큐가 최대로 늦게 도착할 만한 폭

/**
 * 클라이언트가 보낸 발생 시각을 받되 믿지는 않는다. 미래이거나 너무 과거면 지금으로 친다 —
 * 조작된 시각이 과거 집계를 흔들지 못하게.
 */
function safeAt(raw: unknown): Date {
    const now = Date.now();
    if (typeof raw !== 'string') return new Date(now);
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return new Date(now);
    if (t > now + 60_000) return new Date(now);
    if (t < now - MAX_BACKDATE_MS) return new Date(now);
    return new Date(t);
}

/**
 * 사용성 집계 수집구(U-3). 서버가 볼 수 없는 사건만 여기로 온다.
 *
 * **신원은 세션 쿠키에서 읽는다** — 본문에 회원 식별자가 있어도 쓰지 않는다. 이름·속성은
 * `recordUsage` 가 허용목록으로 다시 거르므로, 무엇을 보내든 스키마 밖은 저장되지 않는다.
 *
 * 응답은 언제나 204 다. 무엇이 걸러졌는지 알려 주면 허용목록을 탐색하는 통로가 된다.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const declared = Number(request.headers.get('content-length') ?? '0');
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
            return new Response(null, { status: 204 });
        }

        const body = (await request.json()) as { events?: unknown };
        const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_BATCH) : [];
        if (events.length === 0) return new Response(null, { status: 204 });

        const supabase = createSupabaseServerClient(request, cookies);
        const {
            data: { user },
        } = await supabase.auth.getUser();

        for (const raw of events) {
            const e = raw as { event?: unknown; page?: unknown; props?: unknown; at?: unknown };
            if (typeof e?.event !== 'string') continue;
            await recordUsage({
                event: e.event,
                page: typeof e.page === 'string' ? e.page : null,
                props: e.props && typeof e.props === 'object' ? (e.props as Record<string, unknown>) : null,
                userId: user?.id ?? null,
                at: safeAt(e.at),
            });
        }
    } catch {
        // 본문이 깨졌거나 세션 조회가 실패했다 — 집계 때문에 오류를 돌려주지 않는다
    }
    return new Response(null, { status: 204 });
};
