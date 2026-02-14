import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase-server';

export const onRequest = defineMiddleware(async ({ request, cookies, locals }, next) => {
    const supabase = createSupabaseServerClient(request, cookies);
    const { data: { session } } = await supabase.auth.getSession();

    locals.supabase = supabase;
    locals.session = session;

    return next();
});
