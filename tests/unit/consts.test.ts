import { describe, it, expect } from 'vitest';
import { SITE_TITLE, SITE_DESCRIPTION } from '../../src/consts';

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
