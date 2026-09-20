import { describe, it, expect, vi, beforeEach } from 'vitest';

// 2-1 업로드 권한 — reviewSubmission / setPublishPermission 단위 테스트.
// supabase-server 를 테이블별로 흉내낸다: profiles(관리자 확인·reject_count), archives/findings(대상 행),
// storage(pending → public 이동).

const state: {
    profile: Record<string, unknown>;
    row: Record<string, unknown> | null;
    updates: Array<{ table: string; data: unknown; id: string }>;
    storage: string[];
} = { profile: {}, row: null, updates: [], storage: [] };

const mockDownload = vi.fn();
const mockUpload = vi.fn();
const mockRemove = vi.fn();

// 2026-09-20 세션 인증 전환: 액션은 클라이언트 id 대신 세션(src/actions/auth.ts)을 본다.
// 테스트는 auth 를 모의하되 **같은 supabase-server 모의의 profiles 조회**를 타게 해 기존 mock 호출 순서를 보존한다.
// session.userId 가 "로그인한 사람"이다.
const session = { userId: '223e4567-e89b-12d3-a456-426614174000' };
vi.mock('../../../src/actions/auth', async () => {
    const { supabaseAdmin } = await import('../../../src/lib/supabase-server');
    const load = async (opts?: { active?: boolean }) => {
        const { data, error } = await (supabaseAdmin as any)
            .from('profiles')
            .select('is_admin, status')
            .eq('id', session.userId)
            .single();
        if (error) throw new Error('사용자를 찾을 수 없습니다.');
        // 기존 테스트의 profiles 모의가 null 을 돌려주는 경우(아이디 중복 조회용) — 일반 회원으로 간주
        const d = (data ?? {}) as { is_admin?: boolean; status?: string | null };
        if (opts?.active && d.status !== 'active') throw new Error('가입 승인된 회원만 이용할 수 있습니다.');
        return { id: session.userId, isAdmin: Boolean(d.is_admin), status: d.status ?? null };
    };
    return {
        requireUser: (_ctx: unknown, opts?: { active?: boolean }) => load(opts),
        requireAdmin: async () => {
            const u = await load();
            if (!u.isAdmin) throw new Error('관리자 권한이 필요합니다.');
            return u;
        },
    };
});

vi.mock('../../../src/lib/supabase-server', () => ({
    supabaseAnon: {},
    supabaseAdmin: {
        from: (table: string) => ({
            select: (_cols?: string) => ({
                eq: (col: string, _val: string) => ({
                    single: () =>
                        Promise.resolve(
                            table === 'profiles'
                                ? { data: state.profile, error: null }
                                : { data: state.row, error: null },
                        ),
                    maybeSingle: () =>
                        Promise.resolve(
                            table === 'profiles'
                                ? { data: { username: 'gildong' }, error: null }
                                : { data: null, error: null },
                        ),
                    // await 가능한 목록 조회(is_admin=true 관리자 목록)
                    then: (resolve: (v: unknown) => void) =>
                        resolve(
                            col === 'is_admin'
                                ? { data: [{ id: 'admin-1' }, { id: 'admin-2' }], error: null }
                                : { data: [], error: null },
                        ),
                }),
            }),
            update: (data: unknown) => ({
                eq: (_col: string, id: string) => {
                    state.updates.push({ table, data, id });
                    return Promise.resolve({ error: null });
                },
            }),
        }),
        storage: {
            from: (bucket: string) => ({
                download: (path: string) => {
                    state.storage.push(`download:${bucket}:${path}`);
                    return mockDownload(path);
                },
                upload: (path: string, blob: unknown, opts?: unknown) => {
                    state.storage.push(`upload:${bucket}:${path}`);
                    return mockUpload(path, blob, opts);
                },
                remove: (paths: string[]) => {
                    state.storage.push(`remove:${bucket}:${paths.join(',')}`);
                    return mockRemove(paths);
                },
            }),
        },
    },
}));

vi.mock('../../../src/lib/email', () => ({ sendFeedbackEmail: vi.fn() }));
vi.mock('../../../src/lib/push', () => ({ sendPushToUsers: vi.fn() }));
vi.mock('../../../src/config/auth', () => ({ resolveFeedbackRecipients: vi.fn() }));
vi.mock('../../../src/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
const mockCreateNotification = vi.fn();
const mockCreateBulk = vi.fn();
vi.mock('../../../src/lib/notification-helper', () => ({
    createNotification: (data: unknown) => mockCreateNotification(data),
    createBulkNotifications: (ids: unknown, data: unknown) => mockCreateBulk(ids, data),
}));
const mockTelegram = vi.fn();
vi.mock('../../../src/lib/telegram', () => ({
    sendTelegramMessage: (text: string) => mockTelegram(text),
    isTelegramConfigured: () => true,
}));

import { server } from '../../../src/actions/index';

const ADMIN_ID = '223e4567-e89b-12d3-a456-426614174000';
const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const ROW_ID = '323e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
    state.profile = { is_admin: true, reject_count: 0 };
    state.row = null;
    state.updates = [];
    state.storage = [];
    mockDownload.mockReset().mockResolvedValue({ data: new Blob(['x']), error: null });
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockRemove.mockReset().mockResolvedValue({ error: null });
    mockCreateNotification.mockReset().mockResolvedValue({});
    mockCreateBulk.mockReset().mockResolvedValue([]);
    mockTelegram.mockReset().mockResolvedValue(true);
});

describe('server.reviewSubmission', () => {
    it('관리자가 아니면 거부', async () => {
        state.profile = { is_admin: false };
        await expect(
            (server.reviewSubmission as any)({ adminId: ADMIN_ID, kind: 'archive', id: ROW_ID, decision: 'approve' }),
        ).rejects.toThrow('관리자 권한이 필요합니다.');
        expect(state.updates).toHaveLength(0);
    });

    it('이미 처리된(pending 아님) 제출물은 거부', async () => {
        state.row = { id: ROW_ID, title: 'T', user_id: USER_ID, status: 'published' };
        await expect(
            (server.reviewSubmission as any)({ adminId: ADMIN_ID, kind: 'finding', id: ROW_ID, decision: 'approve' }),
        ).rejects.toThrow('이미 처리된 제출물입니다.');
    });

    it('승인(archive, 대기 버킷 파일) — 파일 이동 + published + file_bucket 공개 + 작성자 can_publish + 알림', async () => {
        state.row = {
            id: ROW_ID,
            title: '안전관리규정 예시',
            user_id: USER_ID,
            status: 'pending',
            file_url: `${USER_ID}/abc.pdf`,
            file_bucket: 'resources-pending',
        };

        const result = await (server.reviewSubmission as any)({
            adminId: ADMIN_ID,
            kind: 'archive',
            id: ROW_ID,
            decision: 'approve',
        });

        expect(state.storage).toEqual([
            `download:resources-pending:${USER_ID}/abc.pdf`,
            `upload:resources:${USER_ID}/abc.pdf`,
            `remove:resources-pending:${USER_ID}/abc.pdf`,
        ]);
        expect(state.updates).toContainEqual({
            table: 'archives',
            data: { status: 'published', file_bucket: 'resources' },
            id: ROW_ID,
        });
        expect(state.updates).toContainEqual({ table: 'profiles', data: { can_publish: true }, id: USER_ID });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, senderId: ADMIN_ID, link: '/resources' }),
        );
        expect(result.data).toEqual({ success: true, status: 'published' });
    });

    it('승인(finding) — 파일 이동 없음, published + can_publish + 알림', async () => {
        state.row = { id: ROW_ID, title: '지적사례', user_id: USER_ID, status: 'pending' };

        await (server.reviewSubmission as any)({ adminId: ADMIN_ID, kind: 'finding', id: ROW_ID, decision: 'approve' });

        expect(state.storage).toHaveLength(0);
        expect(state.updates).toContainEqual({ table: 'findings', data: { status: 'published' }, id: ROW_ID });
        expect(state.updates).toContainEqual({ table: 'profiles', data: { can_publish: true }, id: USER_ID });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, link: '/findings-recommendations' }),
        );
    });

    it('반려 — rejected + reject_count+1 + 사유 포함 알림', async () => {
        state.profile = { is_admin: true, reject_count: 1 };
        state.row = { id: ROW_ID, title: '지적사례', user_id: USER_ID, status: 'pending' };

        const result = await (server.reviewSubmission as any)({
            adminId: ADMIN_ID,
            kind: 'finding',
            id: ROW_ID,
            decision: 'reject',
            reason: '출처 불명',
        });

        expect(state.updates).toContainEqual({ table: 'findings', data: { status: 'rejected' }, id: ROW_ID });
        expect(state.updates).toContainEqual({ table: 'profiles', data: { reject_count: 2 }, id: USER_ID });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, message: expect.stringContaining('출처 불명') }),
        );
        expect(result.data).toEqual({ success: true, status: 'rejected', rejectCount: 2 });
    });

    it('반려 3회 누적이면 차단 안내가 알림에 들어간다', async () => {
        state.profile = { is_admin: true, reject_count: 2 };
        state.row = { id: ROW_ID, title: 'T', user_id: USER_ID, status: 'pending' };

        await (server.reviewSubmission as any)({ adminId: ADMIN_ID, kind: 'finding', id: ROW_ID, decision: 'reject' });

        expect(state.updates).toContainEqual({ table: 'profiles', data: { reject_count: 3 }, id: USER_ID });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('더 이상 제출할 수 없습니다') }),
        );
    });

    it('알림 실패는 처리 결과를 바꾸지 않는다', async () => {
        state.row = { id: ROW_ID, title: 'T', user_id: USER_ID, status: 'pending' };
        mockCreateNotification.mockRejectedValueOnce(new Error('push down'));
        const result = await (server.reviewSubmission as any)({
            adminId: ADMIN_ID,
            kind: 'finding',
            id: ROW_ID,
            decision: 'approve',
        });
        expect(result.data).toEqual({ success: true, status: 'published' });
    });
});

describe('server.setPublishPermission', () => {
    it('관리자가 아니면 거부', async () => {
        state.profile = { is_admin: false };
        await expect(
            (server.setPublishPermission as any)({ adminId: ADMIN_ID, targetUserId: USER_ID, canPublish: true }),
        ).rejects.toThrow('관리자 권한이 필요합니다.');
    });

    it('부여/회수 — can_publish 갱신 + 알림', async () => {
        const result = await (server.setPublishPermission as any)({
            adminId: ADMIN_ID,
            targetUserId: USER_ID,
            canPublish: false,
        });
        expect(state.updates).toContainEqual({ table: 'profiles', data: { can_publish: false }, id: USER_ID });
        expect(mockCreateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, title: expect.stringContaining('회수') }),
        );
        expect(result.data).toEqual({ success: true, canPublish: false });
    });
});

describe('server.notifySubmission', () => {
    it('pending 제출물 — 관리자 전원 in-app 알림 + 텔레그램 1통', async () => {
        state.row = { id: ROW_ID, title: '안전관리규정 예시', user_id: USER_ID, status: 'pending' };

        const result = await (server.notifySubmission as any)({ kind: 'archive', id: ROW_ID });

        expect(mockCreateBulk).toHaveBeenCalledWith(
            ['admin-1', 'admin-2'],
            expect.objectContaining({ link: '/admin/submissions', message: expect.stringContaining('@gildong') }),
        );
        expect(mockTelegram).toHaveBeenCalledWith(expect.stringContaining('안전관리규정 예시'));
        expect(mockTelegram).toHaveBeenCalledWith(expect.stringContaining('/admin/submissions'));
        expect(result.data).toEqual({ success: true, notified: true, telegram: true });
    });

    it('pending 이 아니면 알리지 않는다', async () => {
        state.row = { id: ROW_ID, title: 'T', user_id: USER_ID, status: 'published' };
        const result = await (server.notifySubmission as any)({ kind: 'finding', id: ROW_ID });
        expect(mockCreateBulk).not.toHaveBeenCalled();
        expect(mockTelegram).not.toHaveBeenCalled();
        expect(result.data).toEqual({ success: true, notified: false, telegram: false });
    });

    it('텔레그램 실패는 삼키고 결과에만 표시', async () => {
        state.row = { id: ROW_ID, title: 'T', user_id: USER_ID, status: 'pending' };
        mockTelegram.mockRejectedValueOnce(new Error('HTTP 401'));
        const result = await (server.notifySubmission as any)({ kind: 'finding', id: ROW_ID });
        expect(result.data).toEqual({ success: true, notified: true, telegram: false });
    });
});
