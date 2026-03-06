import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 00a-permit-design-approval', () => {
    const filePath = resolve(__dirname, '../../../src/content/inspection_prep/00a-permit-design-approval.md');

    it('방사선기기 설계승인서 항목에 작성예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('radiation-equipment-design-approval-sample');
    });

    it('허가증 사본 항목에 방사선발생장치 사용허가증 예시 slug 링크가 포함되어 있다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('radiation-generating-device-permit-sample');
    });

    it('허가증 사본 항목 링크 표시 텍스트가 방사선발생장치 사용허가증 예시이다', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('방사선발생장치 사용허가증 예시');
    });
});
