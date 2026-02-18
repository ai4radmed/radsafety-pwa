#!/usr/bin/env node
/**
 * 운영 서버 헬스체크 스크립트
 *
 * 사용법: npm run check:production
 * 또는:   node scripts/check-production.mjs [URL]
 *
 * 배포 후 수동 체크리스트 3-1, 3-6, 3-7의 자동화 가능한 항목을 검증합니다.
 * 브라우저 없이 순수 HTTP 요청으로 확인하므로 빠르고 신뢰도가 높습니다.
 *
 * 검증 항목:
 * - HTTPS 인증서 유효성
 * - www → apex 리다이렉트 (301/302/308 허용 — Vercel은 308을 기본값으로 사용)
 * - 주요 페이지 HTTP 200 응답
 * - /auth/confirm SSR 동작 (308 CDN 캐시 버그 감지)
 * - /auth/callback SSR 동작
 * - /manifest.webmanifest PWA 응답
 * - API 엔드포인트 응답 코드
 */

const BASE_URL = process.argv[2] || 'https://radsafety.kr';
const WWW_URL = BASE_URL.replace('https://', 'https://www.');

// ANSI 색상
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;
let warned = 0;

function ok(label, detail = '') {
    console.log(`  ${GREEN}✓${RESET} ${label}${detail ? ` ${YELLOW}(${detail})${RESET}` : ''}`);
    passed++;
}

function fail(label, detail = '') {
    console.log(`  ${RED}✗ ${label}${detail ? ` — ${detail}` : ''}${RESET}`);
    failed++;
}

function warn(label, detail = '') {
    console.log(`  ${YELLOW}⚠ ${label}${detail ? ` — ${detail}` : ''}${RESET}`);
    warned++;
}

function section(title) {
    console.log(`\n${BOLD}${CYAN}▶ ${title}${RESET}`);
}

/**
 * HTTP 요청 (리다이렉트 미추적)
 */
async function fetchNoRedirect(url, options = {}) {
    const start = Date.now();
    try {
        const res = await fetch(url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(10000),
            ...options,
        });
        const elapsed = Date.now() - start;
        return { status: res.status, headers: Object.fromEntries(res.headers), elapsed, ok: true };
    } catch (err) {
        const elapsed = Date.now() - start;
        return { status: 0, headers: {}, elapsed, ok: false, error: err.message };
    }
}

/**
 * HTTP 요청 (리다이렉트 추적)
 */
async function fetchFollow(url) {
    const start = Date.now();
    try {
        const res = await fetch(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
        });
        const elapsed = Date.now() - start;
        return { status: res.status, url: res.url, headers: Object.fromEntries(res.headers), elapsed, ok: true };
    } catch (err) {
        const elapsed = Date.now() - start;
        return { status: 0, url: '', headers: {}, elapsed, ok: false, error: err.message };
    }
}

// ──────────────────────────────────────────────────────────────
// 검증 섹션들
// ──────────────────────────────────────────────────────────────

async function checkHttps() {
    section('HTTPS 및 도메인');

    const res = await fetchFollow(BASE_URL);
    if (!res.ok) {
        fail('HTTPS 접속 실패', res.error);
        return;
    }
    if (res.status === 200) {
        ok(`${BASE_URL} → 200 OK`, `${res.elapsed}ms`);
    } else {
        fail(`${BASE_URL} → ${res.status}`, `${res.elapsed}ms`);
    }

    // HSTS 헤더 확인
    if (res.headers['strict-transport-security']) {
        ok('HSTS 헤더 존재');
    } else {
        warn('HSTS 헤더 없음 (보안 권고)');
    }
}

async function checkWwwRedirect() {
    section('www → apex 리다이렉트');

    const res = await fetchNoRedirect(WWW_URL);
    if (!res.ok) {
        fail(`${WWW_URL} 접속 실패`, res.error);
        return;
    }

    const location = res.headers['location'] || '';

    if ([301, 302, 303, 307, 308].includes(res.status)) {
        if (location.includes('radsafety.kr') && !location.includes('www.')) {
            // Vercel은 도메인 리다이렉트에 308을 기본값으로 사용 — 정상으로 허용
            ok(`www → ${location}`, `${res.status} ${res.elapsed}ms`);
        } else {
            warn(`www 리다이렉트 목적지 확인 필요`, `${res.status} → ${location}`);
        }
    } else {
        warn(`www 응답 코드 예외`, `${res.status}, location: ${location}`);
    }
}

async function checkPublicPages() {
    section('공개 페이지 HTTP 200 응답');

    const pages = [
        { path: '/', name: '홈페이지' },
        { path: '/login', name: '로그인 페이지' },
        { path: '/manifest.webmanifest', name: 'PWA Manifest' },
    ];

    for (const { path, name } of pages) {
        const res = await fetchFollow(`${BASE_URL}${path}`);
        if (!res.ok) {
            fail(`${name} (${path})`, res.error);
        } else if (res.status === 200) {
            ok(`${name} (${path})`, `${res.elapsed}ms`);
        } else {
            fail(`${name} (${path}) → ${res.status}`, `${res.elapsed}ms`);
        }
    }
}

async function checkProtectedPages() {
    section('보호 페이지 → 로그인 리다이렉트 (비로그인 HTTP)');

    // 서버사이드 리다이렉트는 SSR 페이지만 가능
    // 클라이언트 가드 페이지는 서버에서 200을 응답 후 JS로 리다이렉트하므로
    // HTTP 레벨에서는 200이 정상
    const pages = [
        { path: '/mypage', name: '마이페이지', expectRedirect: false },
        { path: '/notifications', name: '알림', expectRedirect: true },  // SSR에서 서버사이드 리다이렉트
    ];

    for (const { path, name, expectRedirect } of pages) {
        const res = await fetchNoRedirect(`${BASE_URL}${path}`);
        if (!res.ok) {
            fail(`${name} (${path})`, res.error);
            continue;
        }

        if (expectRedirect) {
            // SSR 서버사이드 리다이렉트: 302/303 예상
            const location = res.headers['location'] || '';
            if ([302, 303, 307].includes(res.status) && location.includes('/login')) {
                ok(`${name} → /login 서버사이드 리다이렉트`, `${res.status}`);
            } else {
                warn(`${name} 리다이렉트 응답 확인 필요`, `${res.status}, location: ${location}`);
            }
        } else {
            // 클라이언트 가드: 서버에서 200 응답 후 JS로 처리
            if (res.status === 200) {
                ok(`${name} → 200 (클라이언트 가드 정상)`, `${res.elapsed}ms`);
            } else {
                warn(`${name} 응답 코드 확인`, `${res.status}`);
            }
        }
    }
}

async function checkAuthEndpoints() {
    section('/auth 엔드포인트 SSR 동작 확인 (CDN 캐시 버그 감지)');

    // /auth/confirm — 308 + 12ms 이하이면 CDN 캐시 장애
    {
        const res = await fetchNoRedirect(`${BASE_URL}/auth/confirm`);
        if (!res.ok) {
            fail('/auth/confirm 접속 실패', res.error);
        } else if (res.status === 308) {
            fail(
                '/auth/confirm → 308 영구 리다이렉트 감지!',
                `CDN 캐시 장애 가능성. 빈 커밋 push로 해결. 응답시간: ${res.elapsed}ms`
            );
        } else if ([302, 303, 307, 200].includes(res.status)) {
            const isLikelyCached = res.elapsed < 20;
            if (isLikelyCached && res.status !== 200) {
                warn(
                    `/auth/confirm → ${res.status} 응답시간 ${res.elapsed}ms (매우 빠름 — CDN 캐시 의심)`,
                    '정상이라면 서버 처리로 100ms 이상 소요'
                );
            } else {
                ok(`/auth/confirm → ${res.status} SSR 정상`, `${res.elapsed}ms`);
            }
        } else {
            warn(`/auth/confirm → ${res.status} 예외`, `${res.elapsed}ms`);
        }

        // Content-Type 확인
        const ct = res.headers['content-type'] || '';
        if (ct.includes('application/json')) {
            fail('/auth/confirm Content-Type이 JSON — prerender 문제 가능성');
        }
    }

    // /auth/callback — 파라미터 없으면 /login 리다이렉트
    {
        const res = await fetchNoRedirect(`${BASE_URL}/auth/callback`);
        if (!res.ok) {
            fail('/auth/callback 접속 실패', res.error);
        } else if (res.status === 308) {
            fail('/auth/callback → 308 영구 리다이렉트!', `CDN 캐시 장애 가능성`);
        } else if ([302, 303, 307, 200].includes(res.status)) {
            ok(`/auth/callback → ${res.status} SSR 정상`, `${res.elapsed}ms`);
        } else {
            warn(`/auth/callback → ${res.status}`, `${res.elapsed}ms`);
        }

        const ct = res.headers['content-type'] || '';
        if (ct.includes('application/json')) {
            fail('/auth/callback Content-Type이 JSON — prerender 문제 가능성');
        }
    }
}

async function checkApiEndpoints() {
    section('API 엔드포인트 응답 확인');

    // /api/archives/[id] — 존재하지 않는 ID로 404 예상 (500이면 서버 에러)
    {
        const res = await fetchFollow(`${BASE_URL}/api/archives/nonexistent-id-000`);
        if (!res.ok) {
            fail('/api/archives/[id] 접속 실패', res.error);
        } else if (res.status === 404) {
            ok('/api/archives/[id] → 404 (정상 — 존재하지 않는 ID)', `${res.elapsed}ms`);
        } else if (res.status === 500) {
            fail('/api/archives/[id] → 500 서버 에러', `${res.elapsed}ms`);
        } else {
            warn(`/api/archives/[id] → ${res.status}`, `${res.elapsed}ms`);
        }
    }
}

async function checkResponseTimes() {
    section('주요 페이지 응답시간 (체감 성능)');

    const targets = [
        { path: '/', name: '홈페이지', warnMs: 1000, failMs: 3000 },
        { path: '/login', name: '로그인', warnMs: 1000, failMs: 3000 },
    ];

    for (const { path, name, warnMs, failMs } of targets) {
        const res = await fetchFollow(`${BASE_URL}${path}`);
        if (!res.ok) {
            fail(`${name} 응답시간 측정 실패`, res.error);
            continue;
        }
        if (res.elapsed > failMs) {
            fail(`${name} 응답시간 ${res.elapsed}ms (${failMs}ms 초과)`, '서울 리전 확인 필요');
        } else if (res.elapsed > warnMs) {
            warn(`${name} 응답시간 ${res.elapsed}ms (${warnMs}ms 초과 — 느림)`, `목표: ${warnMs}ms 이하`);
        } else {
            ok(`${name} 응답시간 ${res.elapsed}ms`);
        }
    }
}

// ──────────────────────────────────────────────────────────────
// 메인 실행
// ──────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n${BOLD}RadSafety 운영 서버 헬스체크${RESET}`);
    console.log(`대상: ${CYAN}${BASE_URL}${RESET}`);
    console.log(`시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log('─'.repeat(50));

    await checkHttps();
    await checkWwwRedirect();
    await checkPublicPages();
    await checkProtectedPages();
    await checkAuthEndpoints();
    await checkApiEndpoints();
    await checkResponseTimes();

    // 결과 요약
    console.log('\n' + '─'.repeat(50));
    console.log(`${BOLD}결과 요약${RESET}`);
    console.log(`  ${GREEN}통과: ${passed}건${RESET}`);
    if (warned > 0) console.log(`  ${YELLOW}경고: ${warned}건${RESET}`);
    if (failed > 0) console.log(`  ${RED}실패: ${failed}건${RESET}`);

    if (failed > 0) {
        console.log(`\n${RED}${BOLD}⚠ 실패 항목이 있습니다. 배포 전 확인이 필요합니다.${RESET}`);
        process.exit(1);
    } else if (warned > 0) {
        console.log(`\n${YELLOW}경고 항목을 확인하세요.${RESET}`);
        process.exit(0);
    } else {
        console.log(`\n${GREEN}${BOLD}✓ 모든 항목 통과${RESET}`);
        process.exit(0);
    }
}

main().catch((err) => {
    console.error(`${RED}헬스체크 실행 실패:${RESET}`, err);
    process.exit(1);
});
