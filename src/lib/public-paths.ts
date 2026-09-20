/**
 * 2계층(공개/회원) 경로 — **단일 권위**.
 *
 * 비가입자가 쓸 수 있는 메뉴(Dr. Ben 확정 2026-09-19): 홈·수검준비·지적권고사례(목록)·자료실
 * (다운로드)·용어검색·이용안내·설정·정보. 사용자 메뉴(마이페이지·알림함·의견·개선의견조회)와
 * 관리자 메뉴는 회원 전용. 세부 권한(사례 본문 차단·업로드 차단)은 각 페이지 + RLS 가 담당.
 *
 * 두 곳이 이 목록을 쓴다 — 클라이언트 `auth-handler`(리다이렉트)와 서버 미들웨어(사용성 집계의
 * `gate_blocked` 판정). **목록을 두 벌로 두면 반드시 어긋난다.** 한쪽만 고친 날 리다이렉트는
 * 되는데 집계는 벽으로 세거나, 그 반대가 된다. 그래서 여기 한 곳만 고친다.
 */
export const PUBLIC_PATHS: readonly string[] = [
    '/',
    '/login',
    '/info',
    '/inspection-prep',
    '/findings-recommendations',
    '/resources',
    '/guide',
    '/settings',
    '/offline',
    '/privacy',
    '/kins',
    '/proposal-lookup', // 익명 제안 조회 — 코드 소지 = 본인. 로그인을 요구하면 조회와 계정이 다시 묶인다(3단계)
];

/** 비회원이 열 수 있는 경로인가. `/` 는 정확히 일치할 때만(접두로 쓰면 전부 공개가 된다). */
export function isPublicPath(path: string): boolean {
    return PUBLIC_PATHS.some((p) => path === p || (p !== '/' && path.startsWith(p)));
}
