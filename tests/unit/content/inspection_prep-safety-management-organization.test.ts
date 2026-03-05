import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const LAW_URL =
    'https://www.law.go.kr/%EB%B2%95%EB%A0%B9%EB%B3%84%ED%91%9C%EC%84%9C%EC%8B%9D/(%EC%9B%90%EC%9E%90%EB%A0%A5%EC%95%88%EC%A0%84%EB%B2%95%20%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99,20260101,%EC%84%9C%EC%8B%9D4)';

describe('inspection_prep 02-1-safety-management-organization', () => {
    it('대표자 변경 관련 항목에 경미한사항변경신고서 법령 링크가 포함되어 있다', () => {
        const filePath = resolve(
            __dirname,
            '../../../src/content/inspection_prep/02-1-safety-management-organization.md',
        );
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain(LAW_URL);
    });
});
