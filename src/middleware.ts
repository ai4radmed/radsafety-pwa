import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase-server';
import { isTrackablePath } from './lib/usage/events';
import { recordUsage } from './lib/usage/record';

export const onRequest = defineMiddleware(async ({ request, cookies, locals }, next) => {
    const supabase = createSupabaseServerClient(request, cookies);
    const {
        data: { session },
    } = await supabase.auth.getSession();

    locals.supabase = supabase;
    locals.session = session;

    // 페이지 조회 기록(U 트랙). 서버 렌더라 여기 한 곳이면 모든 화면 이동이 잡힌다 —
    // 광고 차단기에 지워지지 않고 클라이언트 번들도 늘리지 않는다. 제외 경로 판정은
    // events.ts 가 하며, 제도 개선 제안 계열은 여기서 걸러진다.
    // 실패해도 화면은 정상 응답한다(recordUsage 는 던지지 않는다).
    if (request.method === 'GET') {
        const pathname = new URL(request.url).pathname;
        if (isTrackablePath(pathname)) {
            await recordUsage({
                event: 'page_view',
                page: pathname,
                userId: session?.user?.id ?? null,
            });
        }
    }

    return next();
});
