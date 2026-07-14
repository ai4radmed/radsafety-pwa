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

// 점검 영역(check-production.mjs 의 section key)을 초중급 눈높이 문구로 묶는다.
// key 는 check-production.mjs 와의 계약 — 거기서 바뀌면 여기도 함께.
const REPORT_GROUPS = [
    { emoji: '🌐', title: '보안 접속·주소 연결', keys: ['https', 'www'] },
    { emoji: '🔒', title: '보안 인증서', keys: ['cert'] },
    { emoji: '📄', title: '홈·로그인 화면 응답', keys: ['public', 'speed'] },
    { emoji: '🚧', title: '비로그인 접근 차단', keys: ['protected'] },
    { emoji: '🔑', title: '로그인 처리 경로', keys: ['auth'] },
    { emoji: '🔌', title: 'API 응답', keys: ['api'] },
    { emoji: '🩺', title: '내부 자가진단(설정·DB·메일·푸시)', keys: ['doctor'] },
];

/**
 * 영역별 상태 줄 생성 — "무엇을 확인했는지"를 사람 말로.
 * summary.sections 가 없으면(구버전 요약) 빈 배열을 반환해 상위가 예전 문안으로 폴백한다.
 */
function sectionLines(summary, smoke) {
    const sections = summary.sections || [];
    if (!sections.length) return [];

    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
    const covered = new Set();
    const lines = [];
    const h = summary.highlights || {};

    for (const g of REPORT_GROUPS) {
        const present = g.keys.filter((k) => byKey[k]);
        if (!present.length) continue;
        present.forEach((k) => covered.add(k));

        const failN = present.reduce((n, k) => n + (byKey[k].fail || 0), 0);
        const warnN = present.reduce((n, k) => n + (byKey[k].warn || 0), 0);
        const status = failN > 0 ? `✗ 문제 ${failN}건` : warnN > 0 ? `정상 (경고 ${warnN}건)` : '정상';

        // 정상이어도 의미 있는 수치는 함께 보여준다.
        let extra = '';
        if (g.keys.includes('cert') && h.certDaysLeft != null) {
            extra = ` — ${h.certDaysLeft}일 남음(만료 ${h.certExpiry})`;
        } else if (g.keys.includes('speed') && h.homeMs != null) {
            const sec = h.homeMs / 1000;
            extra = sec < 0.1 ? ' — 홈 0.1초 미만' : ` — 홈 ${sec.toFixed(1)}초`;
        }

        lines.push(`${g.emoji} ${g.title}: ${status}${extra}`);
        lines.push(...itemLines(present.flatMap((k) => byKey[k].items || [])));
    }

    // 그룹 매핑에 없는 새 영역이 생겨도 조용히 사라지지 않게 원래 이름으로 표기.
    for (const s of sections) {
        if (covered.has(s.key)) continue;
        const status = s.fail > 0 ? `✗ 문제 ${s.fail}건` : '정상';
        lines.push(`• ${s.name}: ${status}`);
        lines.push(...itemLines(s.items || []));
    }

    if (smoke === 'success' || smoke === 'failure') {
        lines.push(`🖥 실제 브라우저 화면(JS 오류): ${smoke === 'success' ? '정상' : '✗ 문제'}`);
        // SMOKE_OUTCOME 은 성패만 전달하므로 항목명은 여기 고정 —
        // tests/e2e/production-smoke.spec.ts 의 테스트 구성이 바뀌면 함께 갱신할 것.
        if (smoke === 'success') {
            lines.push('   ✓ 홈 화면 렌더링·JS 크래시 없음');
            lines.push('   ✓ 로그인 화면 렌더링·JS 크래시 없음');
        }
    }

    return lines;
}

/** 영역 아래 세부 항목 줄 — 무엇을 확인했는지 항목명까지 보여준다(✓/⚠/✗). */
function itemLines(items) {
    return items.map((it) => {
        const mark = it.status === 'ok' ? '✓' : it.status === 'warn' ? '⚠' : '✗';
        // 정상 항목은 이름만(수치는 소음), 경고·실패는 사유(detail)까지.
        const tail = it.status !== 'ok' && it.detail ? ` — ${it.detail}` : '';
        return `   ${mark} ${it.label}${tail}`;
    });
}

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
    // deep/shallow 는 개발자 용어 — 받는 사람 눈높이로 풀어 쓴다.
    const modeLabel = summary.deep ? '전체 점검' : '기본 점검';
    const meta = [when, summary.version ? `v${summary.version}` : null, modeLabel].filter(Boolean).join(' · ');

    // 스모크 실패는 HTTP 점검이 전부 통과했어도 "이상"이다 — JS 크래시 백지 화면은 HTTP 로 안 보인다.
    const smokeFailed = opts.smoke === 'failure';
    const areas = sectionLines(summary, opts.smoke);

    if (summary.ok && !smokeFailed) {
        lines.push(`✅ ${host} 정상`);
        lines.push(meta);
        if (areas.length) {
            lines.push('', ...areas, '');
            const warnNote = summary.warned > 0 ? ` · 경고 ${summary.warned}건` : '';
            lines.push(`세부 점검 총 ${summary.passed}건 통과${warnNote}`);
            // 경고 상세는 영역 안의 ⚠ 줄로 이미 표기됨 — 중복 나열하지 않는다.
        } else {
            // 구버전 요약(영역 정보 없음) 폴백
            const warnNote = summary.warned > 0 ? ` · 경고 ${summary.warned}건` : '';
            const smokeNote = opts.smoke === 'success' ? ' · 브라우저 스모크 통과' : '';
            lines.push(`점검 ${summary.passed}건 모두 통과${warnNote}${smokeNote}`);
            // 경고는 초록불을 붉게 만들진 않지만, 뭐가 걸렸는지는 보여준다.
            for (const w of summary.warnings || []) {
                lines.push(`⚠ ${w.label}${w.detail ? ` — ${w.detail}` : ''}`);
            }
        }
        return lines.join('\n');
    }

    const failedCount = summary.failed + (smokeFailed ? 1 : 0);
    lines.push(`❌ ${host} 이상 감지`);
    lines.push(meta);
    lines.push(`문제 ${failedCount}건 / 통과 ${summary.passed}건`);
    if (areas.length) {
        // 영역 지도를 먼저 — 어디가 멀쩡하고 어디가 문제인지 한눈에.
        lines.push('', ...areas, '', '문제 상세:');
    } else {
        lines.push('');
    }

    const list = [
        ...(summary.failures || []),
        ...(smokeFailed
            ? [{ label: '브라우저 화면 검사(홈·로그인 JS 오류)', detail: 'Playwright 실패 — 실행 로그 참조' }]
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
