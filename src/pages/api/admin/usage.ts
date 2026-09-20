import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '../../../lib/supabase-server';
import { kstDayKey, kstMonthKey, kstWeekKey } from '../../../lib/usage/record';

export const prerender = false;

const WINDOW_DAYS = 30;

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}

/**
 * GET /api/admin/usage — 관리자 사용 현황 데이터. 명세: .spec/src/pages/api/admin/usage.md
 *
 * 집계 표는 서비스 롤 전용(RLS 정책 없음)이라 브라우저가 직접 읽을 수 없다. 그래서 관리자
 * 확인을 거친 이 엔드포인트가 대신 읽어 준다 — 다른 관리자 화면과 같은 방식(화면은 fetch).
 *
 * **원시 이벤트는 내주지 않는다.** 집계본만이다. 화면에 필요한 것은 합계뿐이고, 원시를
 * 브라우저로 흘리면 시각·경로가 한자리에 모여 추정 가능성이 올라간다.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(request, cookies);
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: '인증이 필요합니다.' }, 401);
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: '관리자 권한이 필요합니다.' }, 403);

    if (!supabaseAdmin) return json({ error: '서버 설정 오류' }, 500);

    const now = new Date();
    const sinceDay = kstDayKey(new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000));

    const [dailyRes, pageRes, activeRes] = await Promise.all([
        supabaseAdmin.from('usage_daily').select('day, event, count, unique_actors').gte('day', sinceDay),
        supabaseAdmin.from('usage_page_daily').select('day, page, event, count, unique_actors').gte('day', sinceDay),
        supabaseAdmin.from('usage_active').select('period, period_key, unique_actors'),
    ]);

    const active = activeRes.data ?? [];
    const pick = (period: string, key: string) =>
        active.find((a: { period: string; period_key: string }) => a.period === period && a.period_key === key)
            ?.unique_actors ?? 0;

    return json({
        windowDays: WINDOW_DAYS,
        since: sinceDay,
        today: { key: kstDayKey(now), actors: pick('day', kstDayKey(now)) },
        week: { key: kstWeekKey(now), actors: pick('week', kstWeekKey(now)) },
        month: { key: kstMonthKey(now), actors: pick('month', kstMonthKey(now)) },
        daily: dailyRes.data ?? [],
        pages: pageRes.data ?? [],
        errors: [dailyRes.error?.message, pageRes.error?.message, activeRes.error?.message].filter(Boolean),
    });
};
