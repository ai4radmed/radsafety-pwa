import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 02d-measurement-records', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/02d-measurement-records.md');

    it('시설별 외부 방사선량률, 표면오염도 측정기록부 항목 끝에 예시 slug 및 링크 텍스트가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('doserate-surface-contamination-record-sample');
        expect(content).toContain('선량률∙표면오염도 측정기록부 예시');
    });

    it('배출 전 방사능 농도 기록부 항목 끝에 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('pre-discharge-concentration-log-sample');
    });

    it('밀봉선원 누설 점검기록부 항목 끝에 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('sealed-source-leak-test-record-sample');
    });
});
