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

describe('formatReport', () => {
    it('정상이면 ✅ 와 호스트·통과건수·버전을 보고한다', () => {
        const text = formatReport(okSummary);
        expect(text.startsWith('✅')).toBe(true);
        expect(text).toContain('radsafety.kr 정상');
        expect(text).toContain('24건 모두 통과');
        expect(text).toContain('v0.2.1');
    });

    it('실패면 ❌ 와 실패 항목 라벨·detail 을 나열한다', () => {
        const text = formatReport(failSummary);
        expect(text.startsWith('❌')).toBe(true);
        expect(text).toContain('문제 2건');
        expect(text).toContain('[db] db-ping — timeout 5000ms');
        expect(text).toContain('전체 status=degraded (strict)');
    });

    it('경고만 있으면 정상(✅)으로 보고하되 경고를 함께 표기한다', () => {
        const text = formatReport({
            ...okSummary,
            warned: 1,
            warnings: [{ label: 'ts 오래됨 — 캐시 의심', detail: '90s drift' }],
        });
        expect(text.startsWith('✅')).toBe(true);
        expect(text).toContain('경고 1건');
        expect(text).toContain('ts 오래됨');
    });

    it('시각을 KST 로 변환해 표기한다 (UTC 원문 노출 금지)', () => {
        const text = formatReport(okSummary);
        expect(text).toContain('2026-07-14 08:30 KST');
        expect(text).not.toContain('2026-07-13T23:30');
    });

    it('실패가 10건을 넘으면 10건까지만 나열하고 잔여를 요약한다', () => {
        const many = Array.from({ length: 13 }, (_, i) => ({ label: `실패-${i}`, detail: '' }));
        const text = formatReport({ ...failSummary, failed: 13, failures: many });
        expect(text).toContain('실패-9');
        expect(text).not.toContain('실패-10');
        expect(text).toContain('…외 3건');
    });

    it('요약이 없으면(점검 실행 자체 실패) ❌ 로 보고한다 — 정상 오인 금지', () => {
        const text = formatReport(null);
        expect(text.startsWith('❌')).toBe(true);
        expect(text).toContain('점검 실행 자체 실패');
    });

    it('runUrl 이 주어지면 실행 로그 링크를 포함한다', () => {
        const url = 'https://github.com/ai4radmed/radsafety-pwa/actions/runs/1';
        expect(formatReport(failSummary, { runUrl: url })).toContain(url);
        expect(formatReport(null, { runUrl: url })).toContain(url);
    });

    it('스모크 통과 + 요약 정상이면 ✅ 에 스모크 통과를 표기한다', () => {
        const text = formatReport(okSummary, { smoke: 'success' });
        expect(text.startsWith('✅')).toBe(true);
        expect(text).toContain('브라우저 스모크 통과');
    });

    it('스모크 실패면 요약이 정상이어도 ❌ 이상 감지로 승격한다', () => {
        const text = formatReport(okSummary, { smoke: 'failure' });
        expect(text.startsWith('❌')).toBe(true);
        expect(text).toContain('문제 1건');
        expect(text).toContain('브라우저 화면 검사');
    });

    it('스모크 실패는 기존 실패 목록에 합산된다', () => {
        const text = formatReport(failSummary, { smoke: 'failure' });
        expect(text).toContain('문제 3건');
        expect(text).toContain('브라우저 화면 검사');
        expect(text).toContain('[db] db-ping');
    });

    it('스모크 미주입(undefined)이면 문안에 스모크를 언급하지 않는다 (하위 호환)', () => {
        expect(formatReport(okSummary)).not.toContain('스모크');
        expect(formatReport(failSummary)).not.toContain('브라우저');
    });
});

describe('formatReport — 영역별 문안 (sections 포함 요약)', () => {
    const sections = [
        { key: 'https', name: 'HTTPS 및 도메인', ok: 2, warn: 0, fail: 0 },
        { key: 'cert', name: 'TLS 인증서 만료', ok: 1, warn: 0, fail: 0 },
        { key: 'www', name: 'www → apex 리다이렉트', ok: 1, warn: 0, fail: 0 },
        { key: 'public', name: '공개 페이지 HTTP 200 응답', ok: 3, warn: 0, fail: 0 },
        { key: 'protected', name: '보호 페이지 → 로그인 리다이렉트 (비로그인 HTTP)', ok: 2, warn: 0, fail: 0 },
        { key: 'auth', name: '/auth 엔드포인트 SSR 동작 확인 (CDN 캐시 버그 감지)', ok: 2, warn: 0, fail: 0 },
        { key: 'api', name: 'API 엔드포인트 응답 확인', ok: 1, warn: 0, fail: 0 },
        { key: 'doctor', name: 'Doctor 헬스체크 (/api/health)', ok: 10, warn: 0, fail: 0 },
        { key: 'speed', name: '주요 페이지 응답시간 (체감 성능)', ok: 2, warn: 0, fail: 0 },
    ];
    const richOk = { ...okSummary, sections, highlights: { certDaysLeft: 55, certExpiry: '2026-09-08', homeMs: 420 } };

    it('정상이면 영역별 상태 줄과 인증서·속도 수치를 사람 말로 보여준다', () => {
        const text = formatReport(richOk, { smoke: 'success' });
        expect(text.startsWith('✅')).toBe(true);
        expect(text).toContain('🔒 보안 인증서: 정상 — 55일 남음(만료 2026-09-08)');
        expect(text).toContain('📄 홈·로그인 화면 응답: 정상 — 홈 0.4초');
        expect(text).toContain('🩺 내부 자가진단(설정·DB·메일·푸시): 정상');
        expect(text).toContain('🖥 실제 브라우저 화면(JS 오류): 정상');
        expect(text).toContain('세부 점검 총 24건 통과');
        expect(text).not.toContain('deep'); // 개발자 용어 노출 금지
    });

    it('이상이면 영역 지도에서 문제 영역이 ✗ 로 표시되고 문제 상세가 이어진다', () => {
        const broken = {
            ...richOk,
            ok: false,
            failed: 1,
            passed: 23,
            failures: [{ label: '[db] db-ping', detail: 'timeout' }],
            sections: sections.map((s) => (s.key === 'doctor' ? { ...s, fail: 1 } : s)),
        };
        const text = formatReport(broken, { smoke: 'success' });
        expect(text.startsWith('❌')).toBe(true);
        expect(text).toContain('🩺 내부 자가진단(설정·DB·메일·푸시): ✗ 문제 1건');
        expect(text).toContain('🌐 보안 접속·주소 연결: 정상');
        expect(text).toContain('문제 상세:');
        expect(text).toContain('[db] db-ping — timeout');
    });

    it('그룹 매핑에 없는 새 영역도 원래 이름으로 표기된다 (조용한 누락 방지)', () => {
        const withNew = {
            ...richOk,
            sections: [...sections, { key: 'new-area', name: '새 점검 영역', ok: 1, warn: 0, fail: 0 }],
        };
        expect(formatReport(withNew)).toContain('• 새 점검 영역: 정상');
    });

    it('전체 점검/기본 점검 라벨로 deep/shallow 를 풀어 쓴다', () => {
        expect(formatReport(richOk)).toContain('전체 점검');
        expect(formatReport({ ...richOk, deep: false })).toContain('기본 점검');
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
