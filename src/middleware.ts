import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase-server';
import { isTrackablePath } from './lib/usage/events';
import { isPublicPath } from './lib/public-paths';
import { isMonitorRequest } from './lib/usage/monitor';
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
    // 무인 점검·크롤러·배포 후 스크린샷은 사람이 아니다 — 조회로 세면 순위가 기계로 채워진다(2026-09-21 실측).
    if (request.method === 'GET' && !isMonitorRequest(request)) {
        const pathname = new URL(request.url).pathname;
        if (isTrackablePath(pathname)) {
            // 비로그인이 회원 전용 화면을 열면 화면을 보는 게 아니라 벽을 만난 것이다
            // (auth-handler 가 /login 으로 돌려보낸다). 조회로 세면 "봤다"는 거짓이 되고
            // 이탈 지점도 안 보인다 — 그래서 조회 대신 gate_blocked 로 센다(U-2).
            const blocked = !session && !isPublicPath(pathname);
            await recordUsage({
                event: blocked ? 'gate_blocked' : 'page_view',
                page: pathname,
                userId: session?.user?.id ?? null,
            });
        }
    }

    return next();
});
