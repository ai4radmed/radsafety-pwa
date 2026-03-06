import { describe, it, expect, vi } from 'vitest';
import { deleteOwnAccount } from '../../../src/lib/delete-account';

describe('delete-account', () => {
    it('rpc("delete_own_account")를 호출한다', async () => {
        const rpc = vi.fn().mockResolvedValue({ error: null });
        const client = { rpc };

        await deleteOwnAccount(client);

        expect(rpc).toHaveBeenCalledWith('delete_own_account');
    });

    it('성공 시 { error: null }을 반환한다', async () => {
        const client = { rpc: vi.fn().mockResolvedValue({ error: null }) };

        const result = await deleteOwnAccount(client);

        expect(result.error).toBeNull();
    });

    it('실패 시 { error }를 반환한다 (메시지 정규화)', async () => {
        const err = { message: '권한이 없습니다.' };
        const client = { rpc: vi.fn().mockResolvedValue({ error: err }) };

        const result = await deleteOwnAccount(client);

        expect(result.error).not.toBeNull();
        expect(result.error?.message).toBe('권한이 없습니다.');
    });
});
