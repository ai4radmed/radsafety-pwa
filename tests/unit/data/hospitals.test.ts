import { describe, it, expect } from 'vitest';
import { HOSPITALS } from '../../../src/data/hospitals';

describe('hospitals', () => {
    it('모든 항목에 id, name이 존재', () => {
        HOSPITALS.forEach((item) => {
            expect(item.id).toBeDefined();
            expect(item.id.length).toBeGreaterThan(0);
            expect(item.name).toBeDefined();
            expect(item.name.length).toBeGreaterThan(0);
        });
    });

    it('id는 slug 규칙을 따른다 (영문 소문자·숫자·하이픈)', () => {
        HOSPITALS.forEach((item) => {
            expect(item.id).toMatch(/^[a-z0-9-]+$/);
        });
    });

    it('중복된 id가 없어야 함', () => {
        const ids = HOSPITALS.map((h) => h.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
    });

    it("'other'(기타) 항목이 항상 존재", () => {
        expect(HOSPITALS.some((h) => h.id === 'other')).toBe(true);
    });
});
