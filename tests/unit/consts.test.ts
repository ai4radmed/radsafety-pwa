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
    it('예상값과 일치해야 한다', () => {
        expect(APP_VERSION).toBe('0.2.1');
    });
});

describe('APP_RELEASE_DATE', () => {
    it('예상값과 일치해야 한다', () => {
        expect(APP_RELEASE_DATE).toBe('2026-03-20');
    });
});
