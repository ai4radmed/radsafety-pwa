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

// 항목 줄 표기 방식. 저장소 변수 HEALTH_REPORT_STYLE 로 코드 변경 없이 바꾼다.
const STYLES = new Set(['plain', 'both', 'tech']);

// 상태 표식 — 이모지 없이 한 글자로. 항목 줄의 **맨 끝**에 붙어 눈이 한 열만 훑으면 되게 한다.
const MARK = { ok: '[o]', warn: '[!]', fail: '[x]' };

// 점검 영역(check-production.mjs 의 section key)을 초중급 눈높이 문구로 묶는다.
// key 는 check-production.mjs 와의 계약 — 거기서 바뀌면 여기도 함께.
const REPORT_GROUPS = [
    { title: '보안 접속·주소 연결', keys: ['https', 'www'] },
    { title: '보안 인증서', keys: ['cert'] },
    { title: '홈·로그인 화면 응답', keys: ['public', 'speed'] },
    { title: '비로그인 접근 차단', keys: ['protected'] },
    { title: '로그인 처리 경로', keys: ['auth'] },
    { title: 'API 응답', keys: ['api'] },
    { title: '내부 자가진단(설정·DB·메일·푸시)', keys: ['doctor'] },
];

// ── 항목 라벨 쉬운 말 사전 ────────────────────────────────────────────────────
//
// check-production.mjs 의 라벨은 **콘솔(개발자)용**이라 `[4] schema`·`HSTS 헤더 존재` 처럼
// 기술 용어 그대로다. 콘솔은 그게 맞다 — 고칠 대상은 라벨이 아니라 **보고 문안**이다.
// 그래서 번역은 여기(보고 계층)에서만 하고, 점검 스크립트는 건드리지 않는다.
//
// ⚠️ 사전에 없는 라벨은 **원문 그대로** 나간다(조용히 사라지지 않게). 점검 항목이 새로
//    생기면 여기 한 줄을 추가하면 된다 — 빠뜨려도 보고가 깨지진 않고 기술 용어로 보일 뿐이다.
// ‼️ 서술문("…응답합니다")이 아니라 **명사형**으로 쓴다. 판정은 줄 끝의 표식이 진다 —
//    "…화면이 그려졌습니다 [x]" 처럼 문장과 표식이 서로 반대말이 되는 일을 막는다.
const PLAIN_EXACT = {
    'HSTS 헤더 존재': '암호화 접속(https) 강제',
    '홈페이지 (/)': '홈 화면 열림',
    '로그인 페이지 (/login)': '로그인 화면 열림',
    'PWA Manifest (/manifest.webmanifest)': '폰 홈화면 앱 설치 정보',
    'Cache-Control: no-store': '점검 결과 캐시 안 함(매번 새로 확인)',
    '전체 status=ok': '앱 자가진단 종합 판정',
    '비밀값 미노출': '비밀번호·키 미노출',
    'ts 신선 (요청 시각 근처)': '점검 응답 신선도(낡은 캐시 아님)',
    '홈·로그인 화면 렌더링(JS 오류 감지)': '실제 브라우저로 연 홈·로그인 화면',
};

// Doctor 자가진단 항목은 `[층번호] 키` 형태 — 키로만 옮긴다.
const PLAIN_DOCTOR = {
    'app-host': '앱이 도는 서버',
    config: '필수 환경설정 값',
    'db-ping': '데이터베이스 응답',
    'auth-reach': '로그인 서버 연결',
    'storage-reach': '파일 저장소 연결',
    schema: '데이터베이스 표 구조',
    'resend-config': '메일 발송 설정',
    'vapid-pair': '푸시 알림 키 짝',
    meta: '앱 버전·배포 정보',
    content: '안내 문서·자료 콘텐츠',
};

// 값이 매번 달라지는 라벨(주소·잔여일·응답시간…)은 규칙으로 옮긴다.
const PLAIN_RULES = [
    [/^\[\d\]\s+(\S+)$/, (m) => PLAIN_DOCTOR[m[1]]],
    [/^https?:\/\/\S+\s+→\s+200 OK$/, () => '사이트 접속 응답'],
    [/^www\s+→\s+\S+$/, () => 'www 주소 → 정식 주소 연결'],
    [/^인증서 유효\s+—\s+(\d+)일 남음$/, (m) => `보안 인증서 유효 (${m[1]}일 남음)`],
    [/^(\S+?)\s*응답시간\s+(\d+)ms$/, (m) => `${m[1]} 응답 ${(Number(m[2]) / 1000).toFixed(1)}초`],
    [/^마이페이지\s+→/, () => '비로그인 시 마이페이지 내용 숨김'],
    [/^알림\s+→/, () => '비로그인 시 알림 → 로그인 화면으로 보냄'],
    [/^\/auth\/confirm\s+→/, () => '이메일 인증 링크 처리 경로'],
    [/^\/auth\/callback\s+→/, () => '로그인 후 앱으로 복귀하는 경로'],
    [/^\/api\/archives/, () => '자료실 조회 기능'],
];

/** 기술 라벨 → 쉬운 말. 사전·규칙에 없으면 null(원문을 쓰라는 뜻). */
function plainLabel(label) {
    if (PLAIN_EXACT[label]) return PLAIN_EXACT[label];
    for (const [re, fn] of PLAIN_RULES) {
        const m = label.match(re);
        if (m) {
            const out = fn(m);
            if (out) return out;
        }
    }
    return null;
}

/**
 * 요약 → 번호 매긴 그룹 트리.
 *
 * 번호 규칙: 큰분류는 `1.` `2.` …, 세부항목은 `1-1.` `1-2.` `2-3.` … 으로
 * **큰분류가 바뀌어도 세부번호는 이어서 증가**한다. 그래서 마지막 항목 번호 = 전체 항목 수이고,
 * 머리줄의 `(28/28)` 과 같은 축을 쓴다 — 두 숫자가 어긋나면 그 자체가 버그 신호다.
 *
 * @returns {{groups: Array, total: number, okCount: number, problems: Array}}
 *   groups 가 비면(구버전 요약 — sections·items 없음) 상위가 폴백 문안을 쓴다.
 */
function buildGroups(summary, smoke) {
    const sections = summary.sections || [];
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
    const covered = new Set();
    const h = summary.highlights || {};
    const groups = [];

    const push = (title, extra, items) => {
        if (!items.length) return;
        groups.push({ title, extra, items });
    };

    for (const g of REPORT_GROUPS) {
        const present = g.keys.filter((k) => byKey[k]);
        if (!present.length) continue;
        present.forEach((k) => covered.add(k));

        // 큰분류 줄의 부가 수치는 **항목 라벨에 없는 것만** 싣는다.
        // (잔여일·응답시간은 이미 항목 라벨에 있다 — 되풀이하면 줄만 길어진다.)
        const extra = g.keys.includes('cert') && h.certExpiry ? `만료 ${h.certExpiry}` : '';

        push(
            g.title,
            extra,
            present.flatMap((k) => itemsOf(byKey[k])),
        );
    }

    // 그룹 매핑에 없는 새 영역이 생겨도 조용히 사라지지 않게 원래 이름으로 표기.
    for (const s of sections) {
        if (covered.has(s.key)) continue;
        push(s.name, '', itemsOf(s));
    }

    // 브라우저 스모크는 별도 스텝(SMOKE_OUTCOME)이라 요약 JSON 밖에서 들어온다.
    // 성패만 전달되므로 **항목은 하나** — 홈·로그인 중 어느 쪽이 깨졌는지 알 수 없다.
    // 억지로 2개로 쪼개면 실패일 때 총 항목 수가 흔들려 (N/N) 축이 무너진다.
    if (smoke === 'success' || smoke === 'failure') {
        push('실제 브라우저 화면', '', [
            {
                status: smoke === 'success' ? 'ok' : 'fail',
                label: '홈·로그인 화면 렌더링(JS 오류 감지)',
                detail: smoke === 'success' ? '' : 'Playwright 실패, 실행 로그 참조',
            },
        ]);
    }

    // 번호 부여 + 집계. 세부번호는 그룹을 가로질러 하나의 흐름으로 증가한다.
    let n = 0;
    let okCount = 0;
    const problems = [];
    groups.forEach((g, gi) => {
        g.no = gi + 1;
        for (const it of g.items) {
            it.no = `${g.no}-${++n}`;
            if (it.status === 'ok') okCount++;
            else problems.push(it);
        }
    });

    return { groups, total: n, okCount, problems };
}

/**
 * 영역의 세부 항목 목록. items 가 없는 구버전 요약이면 집계 숫자로 대체 항목을 만든다 —
 * 숫자만 있고 이름이 없다고 해서 조용히 사라지면 (N/N) 총합이 실제와 어긋난다.
 */
function itemsOf(s) {
    if (s.items && s.items.length) return s.items;
    const out = [];
    if (s.fail > 0) out.push({ status: 'fail', label: `${s.name}`, detail: `문제 ${s.fail}건` });
    if (s.warn > 0) out.push({ status: 'warn', label: `${s.name}`, detail: `경고 ${s.warn}건` });
    if (s.ok > 0) out.push({ status: 'ok', label: `${s.name} ${s.ok}건`, detail: '' });
    return out;
}

/**
 * 세부 항목 줄. 정상은 이름만(수치는 소음), 경고·실패는 사유까지.
 *
 * style:
 *   'plain'(기본) — 쉬운 말 한 줄.        `1-2. 접속이 항상 암호화(https)로 강제됩니다 [o]`
 *   'both'        — 기술 원문 + 쉬운 말 2줄. 문제를 남에게 전달할 때 원문이 필요한 경우.
 *   'tech'        — 기술 원문 한 줄(종전).
 *
 * 쉬운 말 사전에 없는 라벨은 어느 style 이든 원문으로 나온다 — 번역이 없다고 항목이 사라지면 안 된다.
 */
function itemLine(it, style = 'plain') {
    const mark = MARK[it.status] || MARK.fail;
    const tail = it.status !== 'ok' && it.detail ? ` — ${it.detail}` : '';
    const plain = plainLabel(it.label);

    if (style === 'tech' || !plain) return [`${it.no}. ${it.label}${tail} ${mark}`];
    if (style === 'both') return [`${it.no}. ${it.label}${tail} ${mark}`, `      ${plain}`];
    return [`${it.no}. ${plain}${tail} ${mark}`];
}

/**
 * 요약 JSON → 텔레그램 보고 문안(평문).
 * 순수 함수 — 네트워크·시간·환경에 의존하지 않는다(테스트 대상).
 *
 * @param {object|null} summary  check-production.mjs 의 요약. null 이면 점검 실행 자체가 실패한 것.
 * @param {{ runUrl?: string, smoke?: 'success' | 'failure', style?: string }} [opts]
 *   opts.style — 항목 표기 방식 'plain'(기본) | 'both' | 'tech'. 알 수 없는 값은 'plain'.
 *   opts.smoke — 브라우저 스모크(Playwright) 결과. HTTP 점검과 별도 스텝이므로 요약 JSON 밖에서 주입된다.
 *   undefined 는 "스모크를 돌리지 않았다"(구버전 워크플로·로컬 실행)로, 문안에 언급하지 않는다.
 */
export function formatReport(summary, opts = {}) {
    const lines = [];

    // 요약이 없다 = 점검 스크립트가 요약을 남기기도 전에 죽었다. 정상으로 오인하면 안 된다.
    if (!summary) {
        lines.push('radsafety.kr 점검 실행 자체 실패 [x]');
        lines.push('헬스체크 스크립트가 결과를 남기지 못했습니다(크래시·네트워크·CI 오류).');
        if (opts.runUrl) lines.push('', `실행 로그: ${opts.runUrl}`);
        return lines.join('\n');
    }

    const host = (summary.baseUrl || '').replace(/^https?:\/\//, '');
    const when = formatKst(summary.checkedAt);
    // deep/shallow 는 개발자 용어 — 받는 사람 눈높이로 풀어 쓴다.
    const modeLabel = summary.deep ? '전체 점검' : '기본 점검';
    const meta = [when, summary.version ? `v${summary.version}` : null, modeLabel].filter(Boolean).join(' · ');

    const { groups, total, okCount, problems } = buildGroups(summary, opts.smoke);

    // 구버전 요약(영역·항목 정보 없음) 폴백 — 번호를 매길 대상이 없으므로 집계만 낸다.
    if (!groups.length) {
        const n = (summary.passed || 0) + (summary.warned || 0) + (summary.failed || 0);
        lines.push(headline(host, n, summary.passed || 0, summary.failed || 0, summary.warned || 0));
        lines.push(meta);
        lines.push('', '세부 항목 정보 없음(구버전 요약)');
        for (const f of (summary.failures || []).slice(0, MAX_LISTED_FAILURES)) {
            lines.push(`${f.label}${f.detail ? ` — ${f.detail}` : ''} ${MARK.fail}`);
        }
        for (const w of (summary.warnings || []).slice(0, MAX_LISTED_FAILURES)) {
            lines.push(`${w.label}${w.detail ? ` — ${w.detail}` : ''} ${MARK.warn}`);
        }
        if (opts.runUrl && summary.failed > 0) lines.push('', `실행 로그: ${opts.runUrl}`);
        return lines.join('\n');
    }

    const failN = problems.filter((p) => p.status === 'fail').length;
    const warnN = problems.filter((p) => p.status !== 'fail').length;

    lines.push(headline(host, total, okCount, failN, warnN));
    lines.push(meta);

    const style = STYLES.has(opts.style) ? opts.style : 'plain';
    for (const g of groups) {
        lines.push('', `${g.no}. ${g.title}${g.extra ? ` (${g.extra})` : ''}`);
        for (const it of g.items) lines.push(...itemLine(it, style));
    }

    // 문제가 있으면 번호만 한 줄로 되짚는다 — 긴 목록에서 눈으로 [x] 를 찾지 않게.
    if (problems.length) {
        const ref = (st) =>
            problems
                .filter((p) => (st === 'fail' ? p.status === 'fail' : p.status !== 'fail'))
                .slice(0, MAX_LISTED_FAILURES)
                .map((p) => p.no)
                .join(', ');
        const parts = [];
        if (failN) parts.push(`문제 ${ref('fail')}`);
        if (warnN) parts.push(`경고 ${ref('warn')}`);
        lines.push('', parts.join(' · '));
    }

    if (opts.runUrl && failN > 0) lines.push('', `실행 로그: ${opts.runUrl}`);
    return lines.join('\n');
}

/**
 * 머리줄 — 세부항목 총합 기준. "몇 개 중 몇 개가 정상인가" 한 줄로.
 * 전부 정상일 때만 "모든 점검항목 정상" 이라고 말한다(경고 1건도 그 말을 쓰지 않는다).
 */
function headline(host, total, okCount, failN, warnN) {
    if (!failN && !warnN) return `${host} 모든 점검항목 정상 (${total}/${total})`;
    const parts = [];
    if (failN) parts.push(`문제 ${failN}건`);
    if (warnN) parts.push(`경고 ${warnN}건`);
    return `${host} 점검항목 ${parts.join(' · ')} (${okCount}/${total} 정상)`;
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

    const text = formatReport(summary, {
        runUrl: process.env.GITHUB_RUN_URL,
        smoke,
        style: (process.env.HEALTH_REPORT_STYLE || '').toLowerCase(),
    });
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
