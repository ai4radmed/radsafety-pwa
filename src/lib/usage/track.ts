/**
 * 사용성 집계 — 클라이언트 수집(U-3).
 *
 * 서버가 볼 수 없는 것만 여기서 잡는다: 오프라인 접속 · 앱 설치 · 푸시 허용 · 로그인 성공 ·
 * 자료 내려받기. 나머지(페이지 조회·가입·제출 등)는 서버가 이미 잡으므로 여기 없다.
 *
 * **누가 보냈는지는 서버가 정한다.** 이 모듈은 회원 식별자를 보내지 않는다 — `/api/track` 이
 * 세션 쿠키에서 직접 읽는다. 클라이언트가 신원을 주장하면 그대로 믿는 구멍이 된다.
 *
 * 오프라인이 핵심 지표라, 오프라인일 때 발생한 사건은 브라우저에 쌓아 두었다가 온라인이 되면
 * 보낸다. 큐는 localStorage 한 벌이고, 저장 실패는 조용히 버린다(집계가 앱을 방해하면 안 된다).
 */
import { isKnownEvent } from './events';

const QUEUE_KEY = 'radsafety.usage.queue';
const MAX_QUEUE = 50; // 오래 오프라인이어도 무한히 쌓이지 않게
const MAX_BATCH = 20; // 서버도 같은 값으로 자른다

interface QueuedEvent {
    event: string;
    page?: string;
    props?: Record<string, string>;
    at: string; // 발생 시각(ISO). 오프라인에서 쌓인 것이 나중에 전송돼도 그때 시각으로 남는다
}

function readQueue(): QueuedEvent[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeQueue(items: QueuedEvent[]): void {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
    } catch {
        // 저장 공간이 없거나 차단된 브라우저 — 집계를 포기할 뿐 앱은 계속 돈다
    }
}

async function send(batch: QueuedEvent[]): Promise<boolean> {
    try {
        const res = await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: batch }),
            keepalive: true,
        });
        return res.ok;
    } catch {
        return false;
    }
}

let flushing = false;

/** 쌓인 것을 보낸다. 실패하면 되돌려 놓고 다음 기회를 기다린다. */
export async function flushTracking(): Promise<void> {
    if (flushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    flushing = true;
    try {
        const batch = queue.slice(0, MAX_BATCH);
        const ok = await send(batch);
        if (ok) {
            // 보내는 동안 새로 들어온 것이 있을 수 있으므로 지금 읽어 앞부분만 덜어낸다
            writeQueue(readQueue().slice(batch.length));
        }
    } finally {
        flushing = false;
    }
}

/**
 * 사건 1건 기록. 허용목록 밖이면 아무것도 하지 않는다 — 서버도 한 번 더 거르지만
 * 보내지 않는 편이 낫다.
 */
export function track(event: string, opts: { page?: string; props?: Record<string, string> } = {}): void {
    if (typeof window === 'undefined') return;
    if (!isKnownEvent(event)) return;
    const item: QueuedEvent = {
        event,
        at: new Date().toISOString(),
        ...(opts.page ? { page: opts.page } : {}),
        ...(opts.props ? { props: opts.props } : {}),
    };
    writeQueue([...readQueue(), item]);
    void flushTracking();
}

let initialized = false;

/**
 * 레이아웃에서 1회 호출. 오프라인 접속을 기록하고, 온라인이 되면 쌓인 것을 보낸다.
 * 화면 전환(View Transitions)마다 다시 불려도 중복 등록되지 않는다.
 */
export function initTracking(): void {
    if (typeof window === 'undefined' || initialized) return;
    initialized = true;

    // 오프라인 사용 자체가 이 앱의 핵심 지표다 — 서비스 워커가 내준 화면이라 서버는 모른다.
    if (navigator.onLine === false) {
        track('offline_visit', { page: window.location.pathname });
    }

    window.addEventListener('online', () => void flushTracking());
    window.addEventListener('pagehide', () => void flushTracking());
    document.addEventListener('astro:page-load', () => {
        if (navigator.onLine === false) {
            track('offline_visit', { page: window.location.pathname });
        } else {
            void flushTracking();
        }
    });

    // 앱 설치 — 설치율은 PWA 로 만든 보람을 재는 유일한 수치다.
    window.addEventListener('appinstalled', () => track('pwa_installed'));

    void flushTracking();
}
