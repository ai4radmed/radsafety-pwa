#!/usr/bin/env node
/**
 * 아침 헬스 보고 — check-production.mjs 의 요약(JSON)을 텔레그램으로 보낸다.
 *
 * 사용법: node scripts/health-report.mjs <summary.json>
 *
 * 환경변수:
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID  → 발송 자격(둘 다 없으면 문안만 출력하고 종료).
 *   HEALTH_REPORT = all(기본) | fail | off → 보고 on/off. 저장소 변수로 제어.
 *   GITHUB_RUN_URL                          → 실패 시 본문에 실행 로그 링크를 넣는다.
 *
 * 원칙: 이 스크립트의 exit code 는 "보고 발송" 성패만 나타낸다.
 *       앱의 건강 상태(실패 여부)는 check-production.mjs 의 exit code 가 이미 표현하므로
 *       여기서 중복해 실패시키지 않는다(보고는 되었는데 job 이 두 번 붉어지는 혼선 방지).
 *
 * 발송 채널을 앱 인프라(Resend)가 아닌 텔레그램으로 둔 이유:
 *   감시자가 감시 대상에 의존하면, 대상이 죽을 때 보고 자체가 침묵한다.
 */

import { readFileSync } from 'node:fs';

const MAX_LISTED_FAILURES = 10;

/**
 * 요약 JSON → 텔레그램 보고 문안(평문).
 * 순수 함수 — 네트워크·시간·환경에 의존하지 않는다(테스트 대상).
 *
 * @param {object|null} summary  check-production.mjs 의 요약. null 이면 점검 실행 자체가 실패한 것.
 * @param {{ runUrl?: string, smoke?: 'success' | 'failure' }} [opts]
 *   opts.smoke — 브라우저 스모크(Playwright) 결과. HTTP 점검과 별도 스텝이므로 요약 JSON 밖에서 주입된다.
 *   undefined 는 "스모크를 돌리지 않았다"(구버전 워크플로·로컬 실행)로, 문안에 언급하지 않는다.
 */
export function formatReport(summary, opts = {}) {
    const lines = [];

    // 요약이 없다 = 점검 스크립트가 요약을 남기기도 전에 죽었다. 정상으로 오인하면 안 된다.
    if (!summary) {
        lines.push('❌ radsafety 점검 실행 자체 실패');
        lines.push('헬스체크 스크립트가 결과를 남기지 못했습니다(크래시·네트워크·CI 오류).');
        if (opts.runUrl) lines.push('', `실행 로그: ${opts.runUrl}`);
        return lines.join('\n');
    }

    const host = (summary.baseUrl || '').replace(/^https?:\/\//, '');
    const when = formatKst(summary.checkedAt);
    const meta = [when, summary.version ? `v${summary.version}` : null, summary.deep ? 'deep' : 'shallow']
        .filter(Boolean)
        .join(' · ');

    // 스모크 실패는 HTTP 점검이 전부 통과했어도 "이상"이다 — JS 크래시 백지 화면은 HTTP 로 안 보인다.
    const smokeFailed = opts.smoke === 'failure';

    if (summary.ok && !smokeFailed) {
        lines.push(`✅ ${host} 정상`);
        lines.push(meta);
        const warnNote = summary.warned > 0 ? ` · 경고 ${summary.warned}건` : '';
        const smokeNote = opts.smoke === 'success' ? ' · 브라우저 스모크 통과' : '';
        lines.push(`점검 ${summary.passed}건 모두 통과${warnNote}${smokeNote}`);
        // 경고는 초록불을 붉게 만들진 않지만, 뭐가 걸렸는지는 보여준다.
        for (const w of summary.warnings || []) {
            lines.push(`⚠ ${w.label}${w.detail ? ` — ${w.detail}` : ''}`);
        }
        return lines.join('\n');
    }

    const failedCount = summary.failed + (smokeFailed ? 1 : 0);
    lines.push(`❌ ${host} 이상 감지`);
    lines.push(meta);
    lines.push(`실패 ${failedCount}건 / 통과 ${summary.passed}건`);
    lines.push('');

    const list = [
        ...(summary.failures || []),
        ...(smokeFailed
            ? [{ label: '브라우저 스모크(홈·로그인 렌더·JS 에러)', detail: 'Playwright 실패 — 실행 로그 참조' }]
            : []),
    ];
    for (const f of list.slice(0, MAX_LISTED_FAILURES)) {
        lines.push(`• ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
    }
    if (list.length > MAX_LISTED_FAILURES) {
        lines.push(`…외 ${list.length - MAX_LISTED_FAILURES}건`);
    }

    if (opts.runUrl) lines.push('', `실행 로그: ${opts.runUrl}`);
    return lines.join('\n');
}

/**
 * ISO(UTC) → "2026-07-14 08:30 KST". 보고를 읽는 사람은 서울에 있다.
 */
export function formatKst(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // sv-SE 로케일은 "2026-07-14 08:30" 형태(ISO 유사)를 준다.
    const kst = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(d);
    return `${kst} KST`;
}

/**
 * 보고 모드에 따라 발송 여부 결정.
 * @param {object|null} summary
 * @param {string} [mode] HEALTH_REPORT 값
 * @param {'success' | 'failure'} [smoke] 브라우저 스모크 결과 — fail 모드에서 스모크 실패도 이상으로 취급
 */
export function shouldSend(summary, mode, smoke) {
    const m = (mode || 'all').toLowerCase();
    if (m === 'off') return false;
    if (m === 'fail') return !summary || summary.ok !== true || smoke === 'failure'; // 요약 누락도 이상으로 취급
    return true; // all(기본) — 정상이어도 매일 한 통(하트비트)
}

async function sendTelegram(text, token, chatId) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        // 토큰·chat_id 오류를 조용히 넘기면 "조용하니 정상"이라는 최악의 착각이 생긴다.
        throw new Error(`텔레그램 발송 실패: HTTP ${res.status} ${body.slice(0, 200)}`);
    }
}

async function main() {
    const summaryPath = process.argv[2];
    const mode = process.env.HEALTH_REPORT;
    // GitHub Actions 스텝 outcome: success | failure | skipped | cancelled.
    // success/failure 만 의미 있음 — 그 외(미설정 포함)는 "스모크 없음"으로 취급.
    const rawSmoke = (process.env.SMOKE_OUTCOME || '').toLowerCase();
    const smoke = rawSmoke === 'success' || rawSmoke === 'failure' ? rawSmoke : undefined;

    let summary = null;
    try {
        summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    } catch {
        summary = null; // 요약 없음 → formatReport 가 "점검 실행 자체 실패"로 보고한다.
    }

    if (!shouldSend(summary, mode, smoke)) {
        console.log(`보고 생략 (HEALTH_REPORT=${mode}, ok=${summary?.ok})`);
        return;
    }

    const text = formatReport(summary, { runUrl: process.env.GITHUB_RUN_URL, smoke });
    console.log(text);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.log('\nTELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID 미설정 — 발송 생략(문안만 출력).');
        return;
    }

    await sendTelegram(text, token, chatId);
    console.log('\n텔레그램 발송 완료.');
}

// 테스트에서 import 할 땐 main 을 실행하지 않는다.
if (process.argv[1] && process.argv[1].endsWith('health-report.mjs')) {
    main().catch((err) => {
        console.error(err.message);
        process.exit(1);
    });
}
