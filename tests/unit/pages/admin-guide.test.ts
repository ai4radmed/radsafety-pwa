import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/pages/admin-guide.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('admin-guide.astro', () => {
    it('불릿 리스트 구조(ul.feature-list)가 존재한다', () => {
        expect(source).toContain('ul class="feature-list"');
    });

    it('섹션 1에 ADMIN 배지 및 관리자 로그인 확인 관련 텍스트가 있다', () => {
        expect(source).toContain('관리자로 로그인 확인');
        expect(source).toContain('ADMIN 배지');
    });

    it('섹션 2에 회원명부/엑셀 관련 텍스트가 있다', () => {
        expect(source).toContain('회원명부 등록');
        expect(source).toContain('엑셀');
        expect(source).toContain('등록');
    });

    it('섹션 3에 자동 인증 및 승인/취소 관련 텍스트가 있다', () => {
        expect(source).toContain('인증요청 검토');
        expect(source).toContain('자동 인증');
        expect(source).toMatch(/승인|취소/);
    });
});
