// 사용성 집계 허용목록. 무엇을 기록하는지는 이 파일 하나만 보면 된다.
//
// 처리방침이 "기능 사용 횟수를 익명 집계한다" 고 적는 근거가 이 파일이다. 서버가 여기 없는
// 이벤트 이름과 속성 키를 전부 버리므로, 클라이언트가 무엇을 보내든 스키마 밖은 저장되지 않는다.

/** 이벤트 이름 → 허용 속성 키. 빈 배열이면 속성 없이 횟수만 센다. */
export const USAGE_EVENTS: Record<string, readonly string[]> = {
    page_view: [],
    signup: ['method'], // kakao | password
    username_set: [],
    login: ['method'], // kakao | password
    resource_download: ['slug'],
    feedback_sent: [],
    submission_sent: [],
};

/** 속성 값 허용목록. 자유 텍스트를 막는다 — 검색어·제목·본문은 어떤 경로로도 들어오지 않는다. */
const PROP_VALUES: Record<string, readonly string[] | 'slug'> = {
    method: ['kakao', 'password'],
    slug: 'slug', // 영문·숫자·하이픈 64자 이내
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

/**
 * 기록하지 않는 경로.
 *
 * 제도 개선 제안 계열이 핵심이다 — 익명 제출 직전의 페이지 조회가 남으면 3단계에서 끊어 놓은
 * 제안과 계정의 연결이 여기서 다시 생긴다. 관리자 화면은 운영자 본인 동선이라 신호가 아니고,
 * API·자산 경로는 사람의 화면 이동이 아니다.
 */
export const USAGE_EXCLUDED_PREFIXES: readonly string[] = [
    '/proposals',
    '/proposal-lookup',
    '/my-proposals',
    '/admin',
    '/api',
    '/_',
    '/offline',
];

/** 사람이 연 화면인가. 자산·API·제외 경로를 걸러낸다. */
export function isTrackablePath(pathname: string): boolean {
    if (!pathname || !pathname.startsWith('/')) return false;
    if (USAGE_EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return false;
    }
    // 확장자가 붙은 요청은 화면이 아니라 파일이다.
    const last = pathname.split('/').pop() ?? '';
    if (last.includes('.')) return false;
    return true;
}

/** 질의문자열·해시를 떼고 길이를 제한한다. 경로에 개인정보가 실리지 않게 하는 마지막 관문. */
export function normalizePage(pathname: string): string {
    const clean = pathname.split('?')[0].split('#')[0];
    const trimmed = clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
    return trimmed.slice(0, 120);
}

export function isKnownEvent(event: string): boolean {
    return Object.prototype.hasOwnProperty.call(USAGE_EVENTS, event);
}

/**
 * 허용된 키와 값만 남긴다. 허용목록 밖은 조용히 버린다 — 던지지 않는다(집계 때문에 업무가
 * 실패하면 안 된다).
 */
export function sanitizeProps(
    event: string,
    props: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
    if (!props || !isKnownEvent(event)) return null;
    const allowed = USAGE_EVENTS[event];
    const out: Record<string, string> = {};
    for (const key of allowed) {
        const raw = props[key];
        if (typeof raw !== 'string') continue;
        const value = raw.trim();
        if (!value) continue;
        const rule = PROP_VALUES[key];
        if (rule === 'slug') {
            if (SLUG_RE.test(value)) out[key] = value;
        } else if (Array.isArray(rule)) {
            if (rule.includes(value)) out[key] = value;
        }
    }
    return Object.keys(out).length > 0 ? out : null;
}
