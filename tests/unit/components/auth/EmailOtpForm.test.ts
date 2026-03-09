import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * EmailOtpForm.astro 구현체 계약 검증
 * 명세: .spec/tests/unit/components/auth/EmailOtpForm.test.md
 */
const COMPONENT_PATH = path.resolve('src/components/auth/EmailOtpForm.astro');

describe('EmailOtpForm 파일', () => {
    it('구현체 파일이 존재해야 한다', () => {
        expect(fs.existsSync(COMPONENT_PATH), 'EmailOtpForm.astro 파일이 존재해야 함').toBe(true);
    });
});

describe('1단계 UI', () => {
    it('이메일 요청 폼 및 입력 요소가 정의되어 있어야 한다', () => {
        const content = fs.readFileSync(COMPONENT_PATH, 'utf-8');
        expect(content).toContain('id="emailOtpRequestForm"');
        expect(content).toContain('id="emailOtpEmail"');
        expect(content).toContain('id="emailOtpRequestBtn"');
    });
});

describe('2단계 UI', () => {
    it('OTP 검증 폼 및 6자리 입력이 정의되어 있어야 한다', () => {
        const content = fs.readFileSync(COMPONENT_PATH, 'utf-8');
        expect(content).toContain('id="emailOtpVerifyForm"');
        expect(content).toContain('id="emailOtpCode"');
        expect(content).toMatch(/maxlength="6"/);
        expect(content).toMatch(/type:\s*['"]email['"]/);
    });
});

describe('signInWithOtp', () => {
    it('emailRedirectTo를 사용하지 않아야 한다 (PWA 호환)', () => {
        const content = fs.readFileSync(COMPONENT_PATH, 'utf-8');
        expect(content).toContain('signInWithOtp');
        expect(content).not.toContain('emailRedirectTo');
    });
});

describe('verifyOtp', () => {
    it("type: 'email'로 검증해야 한다", () => {
        const content = fs.readFileSync(COMPONENT_PATH, 'utf-8');
        expect(content).toContain('verifyOtp');
        expect(content).toMatch(/type:\s*['"]email['"]/);
    });
});

describe('성공 시 이동', () => {
    it('검증 성공 시 /mypage으로 이동해야 한다', () => {
        const content = fs.readFileSync(COMPONENT_PATH, 'utf-8');
        expect(content).toMatch(/location\.href\s*=\s*['"]\/mypage['"]/);
    });
});
