import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveLastRoute, getLastRoute, restoreLastRouteIfNeeded } from '../../../src/lib/last-route';

const storage: Record<string, string> = {};
const session: Record<string, string> = {};

describe('last-route', () => {
    let replaceMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        storage['last_route'] = '';
        delete storage['last_route'];
        Object.keys(session).forEach((k) => delete session[k]);
        replaceMock = vi.fn();

        vi.stubGlobal('localStorage', {
            getItem: (k: string) => storage[k] ?? null,
            setItem: (k: string, v: string) => {
                storage[k] = v;
            },
            removeItem: (k: string) => {
                delete storage[k];
            },
        });
        vi.stubGlobal('sessionStorage', {
            getItem: (k: string) => session[k] ?? null,
            setItem: (k: string, v: string) => {
                session[k] = v;
            },
        });
        Object.defineProperty(vi.stubGlobal('window', {}), 'location', {
            value: { pathname: '/', search: '', replace: replaceMock },
            writable: true,
        });
    });

    describe('saveLastRoute', () => {
        it('제외 경로(/, /login, /auth)는 저장하지 않는다', () => {
            (window as any).location = { pathname: '/', search: '' };
            saveLastRoute();
            expect(storage['last_route']).toBeUndefined();

            (window as any).location = { pathname: '/login', search: '' };
            saveLastRoute();
            expect(storage['last_route']).toBeUndefined();

            (window as any).location = { pathname: '/auth/callback', search: '' };
            saveLastRoute();
            expect(storage['last_route']).toBeUndefined();
        });

        it('일반 경로(/mypage, /resources)는 저장한다', () => {
            (window as any).location = { pathname: '/mypage', search: '' };
            saveLastRoute();
            expect(JSON.parse(storage['last_route']!).path).toBe('/mypage');

            (window as any).location = { pathname: '/resources', search: '?q=1' };
            saveLastRoute();
            expect(JSON.parse(storage['last_route']!).path).toBe('/resources?q=1');
        });
    });

    describe('getLastRoute', () => {
        it('저장 없으면 null 반환', () => {
            expect(getLastRoute()).toBeNull();
        });

        it('유효 JSON 저장 후 path 반환', () => {
            storage['last_route'] = JSON.stringify({ path: '/notifications' });
            expect(getLastRoute()?.path).toBe('/notifications');
        });
    });

    describe('restoreLastRouteIfNeeded', () => {
        it('path가 /가 아니면 false, replace 호출 안 함', () => {
            (window as any).location = { pathname: '/mypage', search: '' };
            expect(restoreLastRouteIfNeeded()).toBe(false);
            expect(replaceMock).not.toHaveBeenCalled();
        });

        it('sessionStorage에 checked 있으면 false', () => {
            (window as any).location = { pathname: '/', search: '', replace: replaceMock };
            session['last_route_checked'] = 'true';
            storage['last_route'] = JSON.stringify({ path: '/mypage' });
            expect(restoreLastRouteIfNeeded()).toBe(false);
            expect(replaceMock).not.toHaveBeenCalled();
        });

        it('/이고 저장된 경로 있으면 replace 호출 후 true', () => {
            (window as any).location = { pathname: '/', search: '', replace: replaceMock };
            storage['last_route'] = JSON.stringify({ path: '/mypage' });
            expect(restoreLastRouteIfNeeded()).toBe(true);
            expect(replaceMock).toHaveBeenCalledWith('/mypage');
        });
    });
});
