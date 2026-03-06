import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 02e-worker-data', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/02e-worker-data.md');

    it('판독특이자 발생 보고 및 선량확정 통보 공문 항목 끝에 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('dose-determination-notification-sample');
    });

    it('판독특이자 공문 항목의 링크 텍스트가 판독특이자 선량확정 통보 공문 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('판독특이자 선량확정 통보 공문 예시');
    });

    it('건강검진 기록부 항목 끝에 건강검진 기록부 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('worker-health-certificate-sample');
    });
});
