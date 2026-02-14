import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-server';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/mypage';

    if (code) {
        const supabase = createSupabaseServerClient(request, cookies);
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return redirect(next);
        }
    }

    return redirect('/login');
};
