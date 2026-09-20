// 사용성 집계(U 트랙)의 조정 가능한 수치.
//
// 코드에 숫자를 박으면 바꿀 때마다 브랜치·PR·검사·릴리스를 거쳐야 한다. 두 값 다 "실제 수치를
// 보고 나서 조정하고 싶어지는" 종류라 환경변수로 뺀다 — Vercel 에서 숫자만 고치고 재배포하면
// 된다(2026-09-20 Dr. Ben). ⚠️ 환경변수는 재배포해야 반영된다.

// Vercel 은 런타임 env 를 import.meta.env 에 인라인하지 않을 수 있다(telegram.ts 와 같은 함정).
function envInt(name: string, fallback: number): number {
    const raw =
        (import.meta.env as Record<string, string | undefined>)[name] ||
        (typeof process !== 'undefined' ? process.env[name] : undefined);
    if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
    const n = Number.parseInt(String(raw).trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * 원시 이벤트 보존 일수. 지난 행은 야간 작업이 지운다. 집계본은 영구라 원시의 유일한 용도는
 * 집계에 문제가 생겼을 때 다시 계산하는 것이다.
 *
 * 기본 35일 — 31일 달의 월간 활성자를 그 달 마지막 날에 세려면 31일치가 남아 있어야 하고,
 * 야간 작업 지연 하루를 더한 값이다. 이보다 줄이면 월간 수치가 틀어진다.
 */
export const USAGE_RETENTION_DAYS = envInt('USAGE_RETENTION_DAYS', 35);

/**
 * 관리자 화면에서 이 값 미만의 수치를 가린다. 0 이면 가리지 않는다(기본값).
 *
 * 앱이 자리를 잡기 전에는 대부분의 수치가 작아서 가리면 화면이 비어 버린다 — 그래서 기본은
 * 끔(2026-09-20 Dr. Ben). 나중에 이 화면을 관리자 밖에 보여줄 일이 생기면 5 정도로 올린다.
 * 회원 수가 수백 명이면 하루 1~2건짜리 수치는 다른 정보와 맞춰볼 때 누구인지 좁혀질 수 있다.
 */
export const USAGE_MIN_DISPLAY_COUNT = envInt('USAGE_MIN_DISPLAY_COUNT', 0);

/** 화면 표기용. 가리기가 켜져 있고 수치가 기준 미만이면 `<N` 을 돌려준다. */
export function displayCount(n: number): string {
    if (USAGE_MIN_DISPLAY_COUNT > 0 && n > 0 && n < USAGE_MIN_DISPLAY_COUNT) {
        return `<${USAGE_MIN_DISPLAY_COUNT}`;
    }
    return String(n);
}
