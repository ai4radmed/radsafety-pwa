import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 02g-radiation-security-management', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/02g-radiation-security-management.md');

    it('선원보안관리 현황 항목 끝에 RI 취급시설 보안점검표 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('ri-facility-security-checklist-sample');
    });

    it('선원보안관리 현황 항목의 링크 텍스트가 RI 취급시설 보안점검표 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('RI 취급시설 보안점검표 예시');
    });
});
