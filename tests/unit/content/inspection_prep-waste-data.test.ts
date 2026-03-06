import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 02f-waste-data', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/02f-waste-data.md');

    it('방사선원 위탁폐기 관련 증빙자료 항목 끝에 RI 위탁폐기 증빙자료 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('ri-waste-disposal-consignment-proof-sample');
    });

    it('방사선원 위탁폐기 관련 증빙자료 항목의 링크 텍스트가 RI 위탁폐기 증빙자료 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('RI 위탁폐기 증빙자료 예시');
    });
});
