import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 01-previous-inspection-records', () => {
    it('시설검사 합격통보 공문 항목에 결과통보공문 작성예시 slug 링크가 포함되어 있다', () => {
        const filePath = resolve(__dirname, '../../../src/content/inspection_prep/01-previous-inspection-records.md');
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('periodic-inspection-result-notification-sample');
        expect(content).toContain('inspection-corrective-action-report-sample');
    });
});
