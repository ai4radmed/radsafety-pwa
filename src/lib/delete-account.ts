/**
 * 회원 탈퇴 RPC 호출.
 * 확인·signOut·리다이렉트는 호출측(mypage)에서 처리.
 * 명세: .spec/src/lib/delete-account.md
 */

/** Supabase 브라우저 클라이언트와 호환되는 최소 타입 (rpc는 thenable 반환) */
export type DeleteAccountClient = {
    rpc: (name: string) => PromiseLike<{ error: { message?: string } | null }>;
};

export async function deleteOwnAccount(client: DeleteAccountClient): Promise<{ error: { message: string } | null }> {
    const { error } = await client.rpc('delete_own_account');
    if (!error) return { error: null };
    return { error: { message: error.message ?? '' } };
}
