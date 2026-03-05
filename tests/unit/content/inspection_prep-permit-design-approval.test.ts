import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('inspection_prep 00a-permit-design-approval', () => {
    it('방사선기기 설계승인서 항목에 작성예시 slug 링크가 포함되어 있다', () => {
        const filePath = resolve(__dirname, '../../../src/content/inspection_prep/00a-permit-design-approval.md');
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('radiation-equipment-design-approval-sample');
    });
});
