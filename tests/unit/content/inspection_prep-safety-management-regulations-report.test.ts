import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 02-safety-management-regulations-report', () => {
    it('안전관리규정 항목에 작성지침/예시 slug 링크가 포함되어 있다', () => {
        const filePath = resolve(
            __dirname,
            '../../../src/content/inspection_prep/02-safety-management-regulations-report.md',
        );
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('safety-management-regulations-preparation-guide');
        expect(content).toContain('safety-management-regulations-sample');
    });
});
