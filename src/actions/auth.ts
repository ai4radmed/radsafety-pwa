/**
 * 액션 공용 인증 — 세션 쿠키가 권위. 명세: .spec/src/actions/auth.md
 *
 * 2026-09-20 전환: 그전까지 index.ts 의 액션들은 클라이언트가 보낸 `adminId`/`userId` 를 믿고
 * `profiles.is_admin` 만 대조했다 — 관리자 UUID 를 아는 사람이 API 를 직접 호출하면 관리자 동작이 가능한 구조.
 * 이제 모든 액션은 요청의 Supabase 세션에서 사용자를 읽고, 클라이언트가 넘긴 id 는 무시한다(하위 호환으로
 * 입력 스키마에 optional 로만 남김).
 */

import { ActionError, type ActionAPIContext } from 'astro:actions';
import { supabaseAdmin, createSupabaseServerClient } from '../lib/supabase-server';

export type SessionUser = { id: string; isAdmin: boolean; status: string | null };

/**
 * 세션 사용자. 없으면 UNAUTHORIZED. `active: true` 면 가입 승인(active) 회원만 통과.
 * 테스트·서버 내부 호출처럼 context 가 없으면 미인증으로 본다(조용히 통과시키지 않는다).
 */
export async function requireUser(
    context: ActionAPIContext | undefined,
    options: { active?: boolean } = {},
): Promise<SessionUser> {
    if (!context?.request || !context.cookies) {
        throw new ActionError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
    }
    const supabase = createSupabaseServerClient(context.request, context.cookies);
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ActionError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
    if (!supabaseAdmin) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: '서버 설정 오류' });

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('is_admin, status')
        .eq('id', user.id)
        .single();
    if (error || !profile) throw new ActionError({ code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' });
    if (options.active && profile.status !== 'active') {
        throw new ActionError({ code: 'FORBIDDEN', message: '가입 승인된 회원만 이용할 수 있습니다.' });
    }
    return { id: user.id, isAdmin: Boolean(profile.is_admin), status: profile.status ?? null };
}

export async function requireAdmin(context: ActionAPIContext | undefined): Promise<SessionUser> {
    const u = await requireUser(context);
    if (!u.isAdmin) throw new ActionError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
    return u;
}
