import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-server';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const url = new URL(request.url);
    const token_hash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type') as 'magiclink' | 'email' | 'signup';
    const next = url.searchParams.get('next') ?? '/mypage';

    if (token_hash && type) {
        const supabase = createSupabaseServerClient(request, cookies);
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });

        if (!error) {
            return redirect(next);
        }
    }

    return redirect('/login');
};
