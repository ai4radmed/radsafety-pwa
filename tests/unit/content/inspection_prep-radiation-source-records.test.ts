import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 02b-radiation-source-records', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/02b-radiation-source-records.md');

    it('방사선원 구매요구서 항목 끝에 예시 slug 링크가 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('radiation-source-order-sample');
    });

    it('방사선원 관리현황보고/생산 판매현황보고 항목 끝에 예시 slug 링크가 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('ri-production-sales-record-sample');
    });

    it('방사선관리구역 출입기록 항목 끝에 예시 slug 링크가 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('controlled-area-access-log-sample');
    });
});
