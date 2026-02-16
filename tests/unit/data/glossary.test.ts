import { describe, it, expect } from 'vitest';
import { glossaryTerms } from '../../../src/data/glossary';

describe('glossaryTerms', () => {
    it('모든 항목에 term과 definition이 존재', () => {
        glossaryTerms.forEach((item) => {
            expect(item.term).toBeDefined();
            expect(item.term.length).toBeGreaterThan(0);
            expect(item.definition).toBeDefined();
            expect(item.definition.length).toBeGreaterThan(0);
        });
    });

    it('최소 1개 이상의 항목이 존재', () => {
        expect(glossaryTerms.length).toBeGreaterThan(0);
    });

    it('중복된 term이 없어야 함', () => {
        const terms = glossaryTerms.map((t) => t.term);
        const uniqueTerms = new Set(terms);
        expect(terms.length).toBe(uniqueTerms.size);
    });
});
