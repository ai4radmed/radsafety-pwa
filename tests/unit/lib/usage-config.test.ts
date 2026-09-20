import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

async function loadConfig() {
    vi.resetModules();
    return import('../../../src/lib/usage/config');
}

describe('usage/config 기본값', () => {
    it('보존 35일 · 가리기 0(끔)', async () => {
        vi.stubEnv('USAGE_RETENTION_DAYS', '');
        vi.stubEnv('USAGE_MIN_DISPLAY_COUNT', '');
        const c = await loadConfig();
        // 35일인 이유: 31일 달의 월간 활성자를 마지막 날에 세려면 31일치가 남아야 하고
        // 야간 작업 지연 하루를 더한 값이다. 이보다 줄이면 월간 수치가 틀어진다.
        expect(c.USAGE_RETENTION_DAYS).toBe(35);
        expect(c.USAGE_MIN_DISPLAY_COUNT).toBe(0);
    });

    it('환경변수로 덮어쓸 수 있다 — 코드 변경 없이 조정', async () => {
        vi.stubEnv('USAGE_RETENTION_DAYS', '60');
        vi.stubEnv('USAGE_MIN_DISPLAY_COUNT', '5');
        const c = await loadConfig();
        expect(c.USAGE_RETENTION_DAYS).toBe(60);
        expect(c.USAGE_MIN_DISPLAY_COUNT).toBe(5);
    });

    it('숫자가 아니거나 음수면 기본값으로 되돌아간다', async () => {
        vi.stubEnv('USAGE_RETENTION_DAYS', 'ㅁㄴㅇㄹ');
        vi.stubEnv('USAGE_MIN_DISPLAY_COUNT', '-3');
        const c = await loadConfig();
        expect(c.USAGE_RETENTION_DAYS).toBe(35);
        expect(c.USAGE_MIN_DISPLAY_COUNT).toBe(0);
    });
});

describe('usage/config 표기', () => {
    it('가리기가 꺼져 있으면(기본) 작은 수도 그대로 보여준다', async () => {
        vi.stubEnv('USAGE_MIN_DISPLAY_COUNT', '0');
        const c = await loadConfig();
        expect(c.displayCount(1)).toBe('1');
        expect(c.displayCount(0)).toBe('0');
    });

    it('가리기를 켜면 기준 미만만 가리고 0 과 기준 이상은 그대로', async () => {
        vi.stubEnv('USAGE_MIN_DISPLAY_COUNT', '5');
        const c = await loadConfig();
        expect(c.displayCount(3)).toBe('<5');
        expect(c.displayCount(0)).toBe('0');
        expect(c.displayCount(5)).toBe('5');
    });
});
