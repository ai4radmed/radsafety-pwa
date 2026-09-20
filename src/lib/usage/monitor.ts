/**
 * 사람이 아닌 요청 판정 — 사용성 집계에서 뺀다.
 *
 * 왜: 서버 렌더 화면은 무인 점검·크롤러·배포 후 스크린샷 요청도 사람과 똑같이 조회로 기록된다.
 * 2026-09-21 실측 — 회원 공지 전인데 홈 화면 비로그인 조회가 하룻밤에 22건. 매일 도는 상태 점검
 * (`check-production.mjs`·Playwright 스모크)과 배포 후 점검이 홈을 반복해서 연 것이다. 그대로 두면
 * "많이 열린 화면" 순위가 기계가 좋아하는 화면으로 채워진다.
 *
 * 두 겹으로 거른다:
 *  1. **우리 무인 점검은 헤더로 스스로 밝힌다** — `x-radsafety-monitor`. 브라우저 식별 문자열을
 *     흉내 내는 도구라도 이 헤더 하나로 빠진다.
 *  2. 그 밖의 기계는 식별 문자열의 흔한 표식으로 거른다. 완벽하지 않지만 큰 잡음은 걸러진다.
 *
 * 판정이 틀려도 결과는 "기록 안 함"뿐이다 — 앱 동작에는 영향이 없다.
 */

export const MONITOR_HEADER = 'x-radsafety-monitor';

// 크롤러·헤드리스 브라우저·명령줄 도구·배포 점검. 실제 브라우저 식별 문자열에는 안 나오는 표식만.
const NON_HUMAN_UA =
    /bot|crawl|spider|slurp|headless|playwright|puppeteer|lighthouse|pingdom|uptime|monitor|vercel-screenshot|curl\/|wget\/|python-requests|undici|^node(\/|$)|node-fetch|go-http-client|okhttp|axios/i;

export function isMonitorRequest(request: Request): boolean {
    if (request.headers.get(MONITOR_HEADER)) return true;
    const ua = request.headers.get('user-agent') ?? '';
    if (ua.trim() === '') return true; // 식별 문자열이 아예 없는 요청은 브라우저가 아니다
    return NON_HUMAN_UA.test(ua);
}
