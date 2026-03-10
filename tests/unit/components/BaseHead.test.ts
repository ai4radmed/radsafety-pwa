import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/BaseHead.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('BaseHead.astro', () => {
    it('파일이 존재한다', () => {
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('PWA 매니페스트 링크가 포함되어 있다', () => {
        expect(source).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    });

    it('apple-mobile-web-app-capable 메타 태그가 포함되어 있다', () => {
        expect(source).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    });

    it('apple-mobile-web-app-status-bar-style 메타 태그가 포함되어 있다', () => {
        expect(source).toContain('<meta name="apple-mobile-web-app-status-bar-style"');
    });

    it('apple-touch-icon 링크가 포함되어 있다', () => {
        expect(source).toContain('<link rel="apple-touch-icon"');
    });

    it('favicon 링크가 포함되어 있다', () => {
        expect(source).toContain('<link rel="icon" href="/favicon.svg"');
    });

    it('registerSW.js 스크립트가 포함되어 있다', () => {
        expect(source).toContain('registerSW.js');
    });
});
