import { describe, it, expect } from 'vitest';
import { resources } from '../../../src/data/resources';

describe('resources', () => {
    it('모든 항목에 id, title, category가 존재', () => {
        resources.forEach((item) => {
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.title.length).toBeGreaterThan(0);
            expect(item.category).toBeDefined();
            expect(item.category.length).toBeGreaterThan(0);
        });
    });

    it('최소 1개 이상의 항목이 존재', () => {
        expect(resources.length).toBeGreaterThan(0);
    });

    it('중복된 id가 없어야 함', () => {
        const ids = resources.map((r) => r.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
    });

    it('모든 항목에 previewUrl과 downloadUrl이 존재', () => {
        resources.forEach((item) => {
            expect(item.previewUrl).toBeDefined();
            expect(item.downloadUrl).toBeDefined();
        });
    });
});
