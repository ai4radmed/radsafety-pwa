import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../../../src/lib/logger';

describe('createLogger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('info는 console.log로 JSON 출력', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('test-module');

        logger.info('테스트 메시지', { key: 'value' });

        expect(spy).toHaveBeenCalledOnce();
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.level).toBe('info');
        expect(output.module).toBe('test-module');
        expect(output.message).toBe('테스트 메시지');
        expect(output.data).toEqual({ key: 'value' });
        expect(output.timestamp).toBeDefined();
    });

    it('warn은 console.warn으로 출력', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const logger = createLogger('warn-test');

        logger.warn('경고 메시지');

        expect(spy).toHaveBeenCalledOnce();
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.level).toBe('warn');
        expect(output.module).toBe('warn-test');
    });

    it('error는 console.error로 출력', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logger = createLogger('error-test');

        logger.error('에러 메시지', { error: 'something broke' });

        expect(spy).toHaveBeenCalledOnce();
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.level).toBe('error');
        expect(output.module).toBe('error-test');
        expect(output.data).toEqual({ error: 'something broke' });
    });

    it('data 없이 호출 시 data 필드는 undefined', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('no-data');

        logger.info('메시지만');

        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.data).toBeUndefined();
    });

    it('timestamp는 ISO 8601 형식', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('timestamp-test');

        logger.info('타임스탬프 테스트');

        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(() => new Date(output.timestamp)).not.toThrow();
        expect(new Date(output.timestamp).toISOString()).toBe(output.timestamp);
    });
});
