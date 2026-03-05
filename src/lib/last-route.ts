/**
 * 마지막 방문 경로 저장/복원. 유효기간 없음.
 * 명세: .spec/src/lib/last-route.md
 */

const KEY = 'last_route';
const CHECKED_KEY = 'last_route_checked';

const EXCLUDE_PREFIXES = ['/login', '/auth', '/offline', '/api'];
const EXCLUDE_EXACT = new Set(['/']);

function isExcluded(path: string): boolean {
    if (EXCLUDE_EXACT.has(path)) return true;
    return EXCLUDE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

export function saveLastRoute(): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname + window.location.search;
    if (isExcluded(path)) return;
    try {
        localStorage.setItem(KEY, JSON.stringify({ path }));
    } catch {
        // ignore
    }
}

export function getLastRoute(): { path: string } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as { path?: string };
        return typeof data?.path === 'string' ? { path: data.path } : null;
    } catch {
        return null;
    }
}

/**
 * 홈(/)에서만 호출. 이 탭에서 아직 복원 안 했고 저장된 경로가 있으면 해당 경로로 replace.
 * @returns 복원 수행 여부(리다이렉트 발생 시 true)
 */
export function restoreLastRouteIfNeeded(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.location.pathname !== '/') return false;
    try {
        if (sessionStorage.getItem(CHECKED_KEY)) return false;
        const last = getLastRoute();
        if (!last || last.path === '/') return false;
        sessionStorage.setItem(CHECKED_KEY, 'true');
        window.location.replace(last.path);
        return true;
    } catch {
        return false;
    }
}
