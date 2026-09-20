import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 이용안내가 **현재 기능과 어긋나지 않는지** 고정한다.
 * 2026-09-20 개정: 2단계 2-2 에서 폐지한 기능(학회 이메일 대조 인증·면허/선임 정보 카드·닉네임/이메일 표시)과
 * 1단계에서 없앤 이메일 OTP 로그인이 안내에 남아 있으면 안 된다. 옛 테스트는 폐지된 카드의
 * `선임기간` 라벨을 요구하고 있어 함께 갱신했다.
 */
const source = fs.readFileSync(path.resolve('src/pages/guide.astro'), 'utf-8');

describe('guide.astro — 폐지된 기능을 안내하지 않는다', () => {
    it('면허·선임 정보 입력 안내가 없다(2-2 삭제)', () => {
        expect(source).not.toContain('<strong>선임기간</strong>');
        expect(source).not.toContain('<strong>면허 및 선임</strong>');
        expect(source).not.toContain('방사선안전관리정보 카드');
    });

    it('학회 이메일 대조 인증 절차를 안내하지 않는다(2-2 폐지)', () => {
        expect(source).not.toContain('자동으로 회원 여부를 검증');
        expect(source).not.toContain('[관리자에게 인증 요청]');
        expect(source).not.toContain('[특별사용자 인증 요청]');
        expect(source).not.toContain('[재인증 요청]');
    });

    it('카카오 닉네임·이메일을 보여준다고 적지 않는다(컬럼 삭제)', () => {
        expect(source).not.toContain('카카오 닉네임 및 등록된 이메일');
    });
});

describe('guide.astro — 현재 규칙을 담는다', () => {
    it('로그인은 아이디/비밀번호와 카카오 둘뿐', () => {
        expect(source).toContain('<strong>아이디/비밀번호</strong>');
        expect(source).toContain('<strong>카카오</strong>');
    });

    it('가입 승인 = 게시 권한, 아이디 변경 불가·비밀번호 변경 가능', () => {
        expect(source).toMatch(/가입이 승인되면 바로 게시/);
        expect(source).toMatch(/아이디 자체는 바꿀 수 없습니다/);
        expect(source).toMatch(/비밀번호를 따로 정해 두면 아이디로도 로그인/);
    });

    it('비회원 이용 범위를 1절에 적는다', () => {
        expect(source).toContain('시작하기 — 회원과 비회원');
        expect(source).toMatch(/로그인하지 않아도/);
    });
});
