import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 36-patient-safety-management', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/36-patient-safety-management.md');

    it('퇴원 일시/격리/퇴원방법 항목 끝에 RI 치료 퇴원 선량측정 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('ri-tx-release-doserate-measurement-sample');
    });

    it('퇴원 일시/격리/퇴원방법 항목의 링크 텍스트가 RI 치료 퇴원 선량측정 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('RI 치료 퇴원 선량측정 예시');
    });

    it('RI 투여 치료병실 퇴원지침서 항목 끝에 RI치료 퇴원지침서 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('ri-tx-release-instruction-sample');
    });

    it('RI 투여 치료병실 퇴원지침서 항목의 링크 텍스트가 RI치료 퇴원지침서 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('RI치료 퇴원지침서 예시');
    });
});
