import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/pages/guide.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('guide.astro', () => {
    it('선임기간 라벨이 존재한다', () => {
        expect(source).toContain('<strong>선임기간</strong>');
    });

    it('준수 기간 라벨은 존재하면 안 된다', () => {
        expect(source).not.toContain('<strong>준수 기간</strong>');
    });
});
