import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { recordUsage } from '../../lib/usage/record';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/mypage';

    if (code) {
        const supabase = createSupabaseServerClient(request, cookies);
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // 카카오 로그인 성공은 서버가 본다 — 클라이언트보다 정확하다(U-3).
            // 비밀번호 로그인은 브라우저에서 끝나므로 그쪽은 /api/track 으로 온다.
            await recordUsage({ event: 'login', props: { method: 'kakao' }, userId: data?.user?.id ?? null });
            return redirect(next);
        }
    }

    return redirect('/login');
};
