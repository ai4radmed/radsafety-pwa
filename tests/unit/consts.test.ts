import { describe, it, expect } from 'vitest';
import { SITE_TITLE, SITE_DESCRIPTION, APP_VERSION, APP_RELEASE_DATE } from '../../src/consts';

describe('SITE_TITLE', () => {
    it('예상값과 일치', () => {
        expect(SITE_TITLE).toBe('RadSafety');
    });

    it('타입이 string', () => {
        expect(typeof SITE_TITLE).toBe('string');
    });
});

describe('SITE_DESCRIPTION', () => {
    it('예상값과 일치', () => {
        expect(SITE_DESCRIPTION).toBe('RadSafety Official Website');
    });

    it('타입이 string', () => {
        expect(typeof SITE_DESCRIPTION).toBe('string');
    });
});

describe('APP_VERSION', () => {
    it('truthy string 이어야 한다', () => {
        expect(typeof APP_VERSION).toBe('string');
        expect(APP_VERSION.length).toBeGreaterThan(0);
    });
});

describe('APP_RELEASE_DATE', () => {
    it('YYYY-MM-DD 형식의 문자열이어야 한다', () => {
        expect(typeof APP_RELEASE_DATE).toBe('string');
        expect(APP_RELEASE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
