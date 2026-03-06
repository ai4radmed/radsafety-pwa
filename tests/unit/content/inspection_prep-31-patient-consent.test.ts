import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 31-patient-consent', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/31-patient-consent.md');

    it('중복된 의료피폭 방사선방호 대책 항목이 없다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).not.toContain('의료피폭에 대한 방사선방호 대책');
    });

    it('환자/보호자 이해 동의 확인 서류 항목 끝에 RI 치료동의서 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('patient-informed-consent-sample');
    });

    it('환자/보호자 이해 동의 확인 서류 항목의 링크 텍스트가 RI 치료동의서 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('RI 치료동의서 예시');
    });
});
