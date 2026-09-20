import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const QUEUE_KEY = 'radsafety.usage.queue';

function stubBrowser(online = true) {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    });
    vi.stubGlobal('navigator', { onLine: online });
    return store;
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

async function load() {
    return import('../../../src/lib/usage/track');
}

describe('usage/track 큐', () => {
    it('허용목록 밖 이름은 큐에 넣지 않는다', async () => {
        const store = stubBrowser(false);
        vi.stubGlobal('window', {});
        const { track } = await load();
        track('keystroke');
        expect(store.get(QUEUE_KEY)).toBeUndefined();
    });

    it('오프라인이면 쌓아 두고 보내지 않는다 — 오프라인 사용이 핵심 지표다', async () => {
        const store = stubBrowser(false);
        vi.stubGlobal('window', {});
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const { track } = await load();
        track('offline_visit', { page: '/inspection-prep' });

        const queued = JSON.parse(store.get(QUEUE_KEY)!);
        expect(queued).toHaveLength(1);
        expect(queued[0].event).toBe('offline_visit');
        expect(queued[0].page).toBe('/inspection-prep');
        expect(queued[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('온라인이면 보내고 성공 시 큐를 비운다', async () => {
        const store = stubBrowser(true);
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

        const { track, flushTracking } = await load();
        track('pwa_installed');
        // track() 이 이미 전송을 시작한다. 그 전송이 끝나도록 한 틱 넘긴 뒤 확인한다
        // (겹쳐 부른 flush 는 즉시 반환하는 게 정상 — 같은 묶음을 두 번 보내지 않으려고).
        await new Promise((r) => setTimeout(r, 0));
        await flushTracking();

        expect(JSON.parse(store.get(QUEUE_KEY)!)).toHaveLength(0);
    });

    it('전송 실패면 큐를 유지한다 — 다음 기회에 다시 보낸다', async () => {
        const store = stubBrowser(true);
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        const { track, flushTracking } = await load();
        track('push_granted');
        await flushTracking();

        expect(JSON.parse(store.get(QUEUE_KEY)!)).toHaveLength(1);
    });

    it('localStorage 가 막혀 있어도 던지지 않는다', async () => {
        vi.stubGlobal('localStorage', {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
        });
        vi.stubGlobal('navigator', { onLine: true });
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn());

        const { track } = await load();
        expect(() => track('pwa_installed')).not.toThrow();
    });
});

describe('usage/track 계약 (소스)', () => {
    const SRC = fs.readFileSync(path.resolve('src/lib/usage/track.ts'), 'utf-8');
    const API = fs.readFileSync(path.resolve('src/pages/api/track.ts'), 'utf-8');

    it('클라이언트는 회원 식별자를 보내지 않는다 — 서버가 세션에서 읽는다', () => {
        expect(SRC).not.toMatch(/userId|user_id|actor_key/);
        expect(API).toMatch(/supabase\.auth\.getUser\(\)/);
        expect(API).toMatch(/userId: user\?\.id \?\? null/);
    });

    it('서버가 허용목록으로 다시 거른다 — 클라이언트 검증만 믿지 않는다', () => {
        expect(API).toMatch(/recordUsage\(/);
    });

    it('응답은 언제나 204 — 무엇이 걸러졌는지 알려 주지 않는다', () => {
        expect(API).toMatch(/status: 204/);
        expect(API).not.toMatch(/status: 4\d\d/);
    });

    it('묶음·본문 크기에 상한이 있다', () => {
        expect(API).toMatch(/MAX_BATCH\s*=\s*20/);
        expect(API).toMatch(/MAX_BODY_BYTES/);
        expect(SRC).toMatch(/MAX_BATCH\s*=\s*20/);
        expect(SRC).toMatch(/MAX_QUEUE\s*=\s*50/);
    });

    it('클라이언트가 보낸 시각을 믿지 않는다 — 미래·과거는 지금으로 친다', () => {
        expect(API).toMatch(/function safeAt/);
        expect(API).toMatch(/MAX_BACKDATE_MS/);
    });
});

describe('U-3 기록 지점 (소스 계약)', () => {
    const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');

    it('카카오 로그인은 서버 콜백이 기록한다 — 클라이언트보다 정확하다', () => {
        const CB = read('src/pages/auth/callback.ts');
        expect(CB).toMatch(/event: 'login', props: \{ method: 'kakao' \}/);
    });

    it('비밀번호 로그인은 성공 직후 클라이언트가 기록한다', () => {
        const FORM = read('src/components/auth/UsernamePasswordForm.astro');
        expect(FORM).toMatch(/track\('login', \{ props: \{ method: 'password' \} \}\)/);
        // 가입 흐름에서 로그인까지 겹쳐 세지 않는다
        expect(FORM).toMatch(/mode === 'login'\) track\('login'/);
    });

    it('푸시 허용·자료 내려받기 기록', () => {
        expect(read('src/pages/settings.astro')).toMatch(/track\('push_granted'\)/);
        expect(read('src/pages/resources.astro')).toMatch(/track\('resource_download'/);
    });

    it('레이아웃 공통 head 에서 1회 초기화한다', () => {
        expect(read('src/components/BaseHead.astro')).toMatch(/initTracking\(\)/);
    });
});
