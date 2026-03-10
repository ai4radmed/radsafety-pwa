import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/Sidebar.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('Sidebar.astro', () => {
    it('nav-links 래퍼가 존재한다', () => {
        expect(source).toContain('<div class="nav-links">');
    });

    it('sidebar 스타일에 overflow: hidden 이 남아있지 않다', () => {
        const sidebarBlockMatch = source.match(/\.sidebar\s*\{[\s\S]*?\}/);
        expect(sidebarBlockMatch).toBeTruthy();
        if (!sidebarBlockMatch) return;
        const block = sidebarBlockMatch[0];
        expect(block.includes('overflow: hidden')).toBe(false);
    });

    it('nav-links 스타일에 overflow-y: auto 가 포함된다', () => {
        const navLinksMatch = source.match(/\.nav-links\s*\{[\s\S]*?\}/);
        expect(navLinksMatch).toBeTruthy();
        if (!navLinksMatch) return;
        const block = navLinksMatch[0];
        expect(block).toContain('overflow-y: auto');
    });

    it('버전 푸터에서 APP_VERSION과 APP_RELEASE_DATE를 사용한다', () => {
        expect(source).toContain('RadSafety v{APP_VERSION} · {APP_RELEASE_DATE}');
    });
});
