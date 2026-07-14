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
        expect(text).toContain('실패 2건');
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

    it('all·미설정은 정상이어도 매일 보낸다 (하트비트)', () => {
        expect(shouldSend(okSummary, 'all')).toBe(true);
        expect(shouldSend(okSummary, undefined)).toBe(true);
    });
});
