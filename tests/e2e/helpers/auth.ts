import { type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 인증 세션 주입 헬퍼
 *
 * 반자동화 전략:
 * 1. 최초 1회: `npm run test:e2e:save-session` 으로 실제 로그인 후 세션 저장
 *    → tests/fixtures/session-user.json (일반 사용자)
 *    → tests/fixtures/session-admin.json (관리자)
 *
 * 2. 이후: 저장된 세션을 Playwright storageState로 주입해 자동 로그인 상태로 테스트
 *
 * 세션 파일은 .gitignore에 포함되어 있으며 로컬에서만 사용합니다.
 * CI에서는 세션 파일이 없으면 해당 테스트를 skip합니다.
 */

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');
const SESSION_USER_PATH = path.join(FIXTURES_DIR, 'session-user.json');
const SESSION_ADMIN_PATH = path.join(FIXTURES_DIR, 'session-admin.json');

export type SessionType = 'user' | 'admin';

/**
 * 세션 파일이 존재하는지 확인
 */
export function hasSession(type: SessionType = 'user'): boolean {
    const filePath = type === 'admin' ? SESSION_ADMIN_PATH : SESSION_USER_PATH;
    return fs.existsSync(filePath);
}

/**
 * 세션 파일 경로 반환
 */
export function getSessionPath(type: SessionType = 'user'): string {
    return type === 'admin' ? SESSION_ADMIN_PATH : SESSION_USER_PATH;
}

/**
 * Context에 저장된 세션을 적용하고 페이지를 반환
 * 세션 파일이 없으면 null 반환 → test.skip() 처리 가능
 */
export async function applySession(context: BrowserContext, type: SessionType = 'user'): Promise<boolean> {
    const filePath = getSessionPath(type);
    if (!fs.existsSync(filePath)) {
        return false;
    }

    const storageState = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // localStorage 항목 주입
    if (storageState.origins) {
        for (const origin of storageState.origins) {
            if (origin.localStorage) {
                await context.addInitScript(
                    ({ items }: { items: { name: string; value: string }[] }) => {
                        for (const { name, value } of items) {
                            localStorage.setItem(name, value);
                        }
                    },
                    { items: origin.localStorage },
                );
            }
        }
    }

    // 쿠키 주입
    if (storageState.cookies && storageState.cookies.length > 0) {
        await context.addCookies(storageState.cookies);
    }

    return true;
}

/**
 * 세션 저장 (save-session 스크립트에서 사용)
 * 현재 페이지의 localStorage + 쿠키를 파일로 저장
 */
export async function saveSession(page: Page, type: SessionType = 'user'): Promise<void> {
    if (!fs.existsSync(FIXTURES_DIR)) {
        fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    const filePath = getSessionPath(type);

    // storageState로 전체 상태 저장
    const storageState = await page.context().storageState();
    fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2));
    console.log(`세션 저장 완료: ${filePath}`);
}

/**
 * 세션 만료 여부 확인 (Supabase 세션 기준)
 * access_token의 만료 시간을 확인
 */
export function isSessionExpired(type: SessionType = 'user'): boolean {
    const filePath = getSessionPath(type);
    if (!fs.existsSync(filePath)) return true;

    try {
        const storageState = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const origins = storageState.origins || [];

        for (const origin of origins) {
            for (const item of origin.localStorage || []) {
                // Supabase는 'sb-<project>-auth-token' 키로 세션 저장
                if (item.name.includes('auth-token')) {
                    const session = JSON.parse(item.value);
                    const expiresAt = session?.expires_at;
                    if (expiresAt) {
                        const expiry = new Date(expiresAt * 1000);
                        const now = new Date();
                        const remainingMs = expiry.getTime() - now.getTime();
                        console.log(`세션 만료까지: ${Math.floor(remainingMs / 60000)}분`);
                        return remainingMs < 0;
                    }
                }
            }
        }
    } catch {
        return true;
    }

    return false;
}
