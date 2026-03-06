import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 45-contamination-records-product', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/45-contamination-records-product.md');

    it('생산제품의 표면오염도 측정기록부 항목 끝에 RI 원내운반 신청서 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('ri-inhospital-transport-request-sample');
    });

    it('생산제품의 표면오염도 측정기록부 항목의 링크 텍스트가 RI 원내운반 신청서 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('RI 원내운반 신청서 예시');
    });
});
