import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/pages/guide.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('guide.astro', () => {
    it('개선의견조회 안내가 존재한다', () => {
        expect(source).toContain('개선의견조회');
    });

    it('상태 의미 3개(검토중/보류/완료)가 존재한다', () => {
        expect(source).toContain('검토중');
        expect(source).toContain('보류');
        expect(source).toContain('완료');
    });

    it('의견보내기 전에 개선의견조회를 확인하라는 가이드가 존재한다', () => {
        expect(source).toContain('의견보내기');
        expect(source).toContain('개선의견조회');
        expect(source).toContain('이미 다른 사용자가');
    });
});
