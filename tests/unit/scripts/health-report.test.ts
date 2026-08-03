import { describe, expect, it } from 'vitest';
import { formatReport, formatKst, shouldSend } from '../../../scripts/health-report.mjs';

// 명세: .spec/tests/unit/scripts/health-report.spec.md

const okSummary = {
    ok: true,
    baseUrl: 'https://radsafety.kr',
    checkedAt: '2026-07-13T23:30:00.000Z', // = 2026-07-14 08:30 KST
    deep: true,
    passed: 24,
    warned: 0,
    failed: 0,
    failures: [],
    warnings: [],
    version: '0.2.1',
    mode: 'deep',
};

const failSummary = {
    ...okSummary,
    ok: false,
    passed: 22,
    failed: 2,
    failures: [
        { label: '[db] db-ping', detail: 'timeout 5000ms' },
        { label: '전체 status=degraded (strict)', detail: 'HTTP 200 · 812ms' },
    ],
};

/** 실제 요약과 같은 모양 — 영역마다 세부 항목(items)이 들어 있다. 총 12개 항목. */
const sections = [
    {
        key: 'https',
        name: 'HTTPS 및 도메인',
        ok: 2,
        warn: 0,
        fail: 0,
        items: [
            { status: 'ok', label: 'https://radsafety.kr → 200 OK', detail: '312ms' },
            { status: 'ok', label: 'HSTS 헤더 존재', detail: '' },
        ],
    },
    {
        key: 'cert',
        name: 'TLS 인증서 만료',
        ok: 1,
        warn: 0,
        fail: 0,
        items: [{ status: 'ok', label: '인증서 유효 — 55일 남음', detail: '만료일 2026-09-08' }],
    },
    {
        key: 'www',
        name: 'www → apex 리다이렉트',
        ok: 1,
        warn: 0,
        fail: 0,
        items: [{ status: 'ok', label: 'www → https://radsafety.kr/', detail: '' }],
    },
    {
        key: 'public',
        name: '공개 페이지 HTTP 200 응답',
        ok: 2,
        warn: 0,
        fail: 0,
        items: [
            { status: 'ok', label: '홈페이지 (/)', detail: '' },
            { status: 'ok', label: '로그인 페이지 (/login)', detail: '' },
        ],
    },
    {
        key: 'protected',
        name: '보호 페이지 → 로그인 리다이렉트 (비로그인 HTTP)',
        ok: 1,
        warn: 0,
        fail: 0,
        items: [{ status: 'ok', label: '알림 → /login 서버사이드 리다이렉트', detail: '' }],
    },
    {
        key: 'auth',
        name: '/auth 엔드포인트 SSR 동작 확인 (CDN 캐시 버그 감지)',
        ok: 1,
        warn: 0,
        fail: 0,
        items: [{ status: 'ok', label: '/auth/confirm → 302 SSR 정상', detail: '' }],
    },
    {
        key: 'api',
        name: 'API 엔드포인트 응답 확인',
        ok: 1,
        warn: 0,
        fail: 0,
        items: [{ status: 'ok', label: '/api/archives/[id] → 404', detail: '' }],
    },
    {
        key: 'doctor',
        name: 'Doctor 헬스체크 (/api/health)',
        ok: 2,
        warn: 0,
        fail: 0,
        items: [
            { status: 'ok', label: 'Cache-Control: no-store', detail: '' },
            { status: 'ok', label: '[3] db-ping', detail: '' },
        ],
    },
    {
        key: 'speed',
        name: '주요 페이지 응답시간 (체감 성능)',
        ok: 1,
        warn: 0,
        fail: 0,
        items: [{ status: 'ok', label: '홈페이지 응답시간 38ms', detail: '' }],
    },
];
const richOk = {
    ...okSummary,
    passed: 12,
    sections,
    highlights: { certDaysLeft: 55, certExpiry: '2026-09-08', homeMs: 420 },
};

/** 특정 영역의 항목 하나를 경고·실패로 바꾼 요약을 만든다. */
function withItemStatus(key: string, status: 'warn' | 'fail', label: string, detail: string) {
    return {
        ...richOk,
        ok: status === 'warn',
        failed: status === 'fail' ? 1 : 0,
        warned: status === 'warn' ? 1 : 0,
        sections: sections.map((s) =>
            s.key === key
                ? { ...s, ok: s.ok - 1, [status]: 1, items: [{ status, label, detail }, ...s.items.slice(1)] }
                : s,
        ),
    };
}

describe('formatReport — 번호식 문안 (2026-08-03 개정)', () => {
    it('전부 정상이면 머리줄이 "모든 점검항목 정상 (N/N)" 이다', () => {
        const text = formatReport(richOk, { smoke: 'success' });
        // 12(HTTP 항목) + 1(브라우저 스모크) = 13
        expect(text.split('\n')[0]).toBe('radsafety.kr 모든 점검항목 정상 (13/13)');
        expect(text.split('\n')[1]).toContain('2026-07-14 08:30 KST');
        expect(text.split('\n')[1]).toContain('v0.2.1');
    });

    it('세부번호는 큰분류가 바뀌어도 이어서 증가하고, 마지막 번호가 총 항목 수와 같다', () => {
        const text = formatReport(richOk, { smoke: 'success' });
        expect(text).toContain('1. 보안 접속·주소 연결');
        expect(text).toContain('1-1. https://radsafety.kr → 200 OK [o]');
        expect(text).toContain('1-3. www → https://radsafety.kr/ [o]'); // https + www 가 한 큰분류
        expect(text).toContain('2. 보안 인증서 (만료 2026-09-08)');
        expect(text).toContain('2-4. 인증서 유효 — 55일 남음 [o]'); // 큰분류가 바뀌어도 세부번호 연속
        expect(text).toContain('8. 실제 브라우저 화면');
        expect(text).toContain('8-13. 홈·로그인 화면 렌더링(JS 오류 감지) [o]'); // 마지막 = 총 13개
    });

    it('이모지·이모티콘을 쓰지 않는다', () => {
        const text = formatReport(richOk, { smoke: 'success' });
        expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2714}\u{2717}\u{26A0}\u{2705}\u{274C}]/u);
    });

    it('정상 항목은 이름만, 경고·실패 항목만 사유를 이어 붙인다', () => {
        const text = formatReport(richOk, { smoke: 'success' });
        expect(text).not.toContain('312ms'); // 정상 항목의 detail 은 소음
        const broken = withItemStatus('doctor', 'fail', '[3] db-ping', 'timeout 5000ms');
        expect(formatReport(broken)).toContain('[3] db-ping — timeout 5000ms [x]');
    });

    it('문제가 있으면 머리줄이 건수와 정상수/총수를 말하고, 되짚기 줄이 번호를 가리킨다', () => {
        const text = formatReport(withItemStatus('doctor', 'fail', '[3] db-ping', 'timeout'), { smoke: 'success' });
        expect(text.split('\n')[0]).toBe('radsafety.kr 점검항목 문제 1건 (12/13 정상)');
        expect(text).toContain('문제 7-11'); // doctor 영역 첫 항목
    });

    it('경고만 있어도 "모든 점검항목 정상" 이라고 말하지 않는다', () => {
        const text = formatReport(withItemStatus('cert', 'warn', '인증서 만료 18일 전', '추이 관찰'), {
            smoke: 'success',
        });
        expect(text.split('\n')[0]).toBe('radsafety.kr 점검항목 경고 1건 (12/13 정상)');
        expect(text).toContain('인증서 만료 18일 전 — 추이 관찰 [!]');
        expect(text).toContain('경고 2-4');
    });

    it('시각을 KST 로 변환해 표기한다 (UTC 원문 노출 금지)', () => {
        const text = formatReport(richOk);
        expect(text).toContain('2026-07-14 08:30 KST');
        expect(text).not.toContain('2026-07-13T23:30');
    });

    it('전체 점검/기본 점검 라벨로 deep/shallow 를 풀어 쓴다', () => {
        expect(formatReport(richOk)).toContain('전체 점검');
        expect(formatReport({ ...richOk, deep: false })).toContain('기본 점검');
        expect(formatReport(richOk)).not.toContain('deep'); // 개발자 용어 노출 금지
    });

    it('그룹 매핑에 없는 새 영역도 원래 이름의 큰분류로 이어진다 (조용한 누락 방지)', () => {
        const withNew = {
            ...richOk,
            sections: [
                ...sections,
                {
                    key: 'new-area',
                    name: '새 점검 영역',
                    ok: 1,
                    warn: 0,
                    fail: 0,
                    items: [{ status: 'ok', label: '새 항목', detail: '' }],
                },
            ],
        };
        const text = formatReport(withNew);
        expect(text).toContain('8. 새 점검 영역');
        expect(text).toContain('8-13. 새 항목 [o]');
    });

    it('items 없는 구버전 영역도 집계 숫자로 항목을 합성해 총합에서 빠지지 않는다', () => {
        const legacy = {
            ...richOk,
            sections: [{ key: 'https', name: 'HTTPS 및 도메인', ok: 2, warn: 0, fail: 0 }],
        };
        const text = formatReport(legacy);
        expect(text.split('\n')[0]).toBe('radsafety.kr 모든 점검항목 정상 (1/1)');
        expect(text).toContain('1-1. HTTPS 및 도메인 2건 [o]');
    });

    it('되짚기 줄의 번호는 10개까지만 싣는다 (메시지 길이 보호)', () => {
        const many = Array.from({ length: 13 }, (_, i) => ({ status: 'fail', label: `실패-${i}`, detail: '' }));
        const text = formatReport({
            ...richOk,
            ok: false,
            failed: 13,
            sections: [{ key: 'doctor', name: 'Doctor', ok: 0, warn: 0, fail: 13, items: many }],
        });
        expect(text).toContain('1-10.');
        expect(text.split('\n').at(-1)).toBe('문제 1-1, 1-2, 1-3, 1-4, 1-5, 1-6, 1-7, 1-8, 1-9, 1-10');
    });

    it('sections 가 아예 없으면 머리줄 + 폴백 문구를 낸다 (구버전 요약)', () => {
        const text = formatReport(okSummary);
        expect(text.split('\n')[0]).toBe('radsafety.kr 모든 점검항목 정상 (24/24)');
        expect(text).toContain('세부 항목 정보 없음');
    });

    it('요약이 없으면(점검 실행 자체 실패) 이상으로 보고한다 — 정상 오인 금지', () => {
        const text = formatReport(null);
        expect(text).toContain('점검 실행 자체 실패 [x]');
        expect(text).not.toContain('정상');
    });

    it('runUrl 은 문제가 있을 때만 싣는다 (정상 보고엔 소음)', () => {
        const url = 'https://github.com/ai4radmed/radsafety-pwa/actions/runs/1';
        expect(formatReport(withItemStatus('doctor', 'fail', 'db-ping', 'timeout'), { runUrl: url })).toContain(url);
        expect(formatReport(null, { runUrl: url })).toContain(url);
        expect(formatReport(richOk, { runUrl: url })).not.toContain(url);
    });

    it('폴백 문안에서도 실패·경고 라벨을 표식과 함께 나열한다', () => {
        const text = formatReport({
            ...failSummary,
            warned: 1,
            warnings: [{ label: 'ts 오래됨 — 캐시 의심', detail: '90s drift' }],
        });
        expect(text.split('\n')[0]).toBe('radsafety.kr 점검항목 문제 2건 · 경고 1건 (22/25 정상)');
        expect(text).toContain('[db] db-ping — timeout 5000ms [x]');
        expect(text).toContain('ts 오래됨 — 캐시 의심 — 90s drift [!]');
    });
});

describe('formatReport — 브라우저 스모크 결합', () => {
    it('스모크 실패면 요약이 정상이어도 이상으로 승격한다', () => {
        const text = formatReport(richOk, { smoke: 'failure' });
        expect(text.split('\n')[0]).toBe('radsafety.kr 점검항목 문제 1건 (12/13 정상)');
        expect(text).toContain('8-13. 홈·로그인 화면 렌더링(JS 오류 감지) — Playwright 실패, 실행 로그 참조 [x]');
    });

    it('스모크 항목은 성패와 무관하게 1개다 (총 항목 수가 흔들리면 N/N 축이 무너진다)', () => {
        const okText = formatReport(richOk, { smoke: 'success' });
        const failText = formatReport(richOk, { smoke: 'failure' });
        expect(okText).toContain('(13/13)');
        expect(failText).toContain('(12/13 정상)');
    });

    it('스모크 미주입(undefined)이면 문안에 스모크를 언급하지 않는다 (하위 호환)', () => {
        const text = formatReport(richOk);
        expect(text).not.toContain('브라우저');
        expect(text.split('\n')[0]).toBe('radsafety.kr 모든 점검항목 정상 (12/12)');
    });
});

describe('formatKst', () => {
    it('빈 값·잘못된 값은 빈 문자열', () => {
        expect(formatKst(undefined)).toBe('');
        expect(formatKst('not-a-date')).toBe('');
    });
});

describe('shouldSend', () => {
    it('off 는 항상 보내지 않는다', () => {
        expect(shouldSend(okSummary, 'off')).toBe(false);
        expect(shouldSend(failSummary, 'off')).toBe(false);
        expect(shouldSend(null, 'off')).toBe(false);
    });

    it('fail 은 이상일 때만 보낸다 (요약 누락도 이상)', () => {
        expect(shouldSend(okSummary, 'fail')).toBe(false);
        expect(shouldSend(failSummary, 'fail')).toBe(true);
        expect(shouldSend(null, 'fail')).toBe(true);
    });

    it('fail 은 스모크 실패도 이상으로 취급한다', () => {
        expect(shouldSend(okSummary, 'fail', 'failure')).toBe(true);
        expect(shouldSend(okSummary, 'fail', 'success')).toBe(false);
    });

    it('all·미설정은 정상이어도 매일 보낸다 (하트비트)', () => {
        expect(shouldSend(okSummary, 'all')).toBe(true);
        expect(shouldSend(okSummary, undefined)).toBe(true);
    });
});
