import { describe, it, expect } from 'vitest';
import { getRole, getCertification, isAdmin, ADMIN_EMAILS } from '../../../src/config/auth';

describe('getRole', () => {
    it('관리자 이메일은 admin 반환', () => {
        expect(getRole('benkorea.ai@gmail.com')).toBe('admin');
    });

    it('일반 이메일은 user 반환', () => {
        expect(getRole('someone@example.com')).toBe('user');
    });

    it('빈 문자열은 user 반환', () => {
        expect(getRole('')).toBe('user');
    });
});

describe('isAdmin', () => {
    it('관리자 이메일은 true', () => {
        expect(isAdmin('benkorea.ai@gmail.com')).toBe(true);
    });

    it('대소문자 무시하여 판별', () => {
        expect(isAdmin('BENKOREA.AI@GMAIL.COM')).toBe(true);
    });

    it('일반 이메일은 false', () => {
        expect(isAdmin('user@example.com')).toBe(false);
    });

    it('빈 문자열은 false', () => {
        expect(isAdmin('')).toBe(false);
    });
});

describe('getCertification', () => {
    it('@ksnm.or.kr 도메인은 ksnm 반환', () => {
        expect(getCertification('user@ksnm.or.kr')).toBe('ksnm');
    });

    it('@ksnmt.or.kr 도메인은 ksnmt 반환', () => {
        expect(getCertification('user@ksnmt.or.kr')).toBe('ksnmt');
    });

    it('SPECIAL_GUESTS 이메일은 special 반환', () => {
        expect(getCertification('guest@kins.re.kr')).toBe('special');
    });

    it('기타 이메일은 none 반환', () => {
        expect(getCertification('user@example.com')).toBe('none');
    });

    it('빈 문자열은 none 반환', () => {
        expect(getCertification('')).toBe('none');
    });
});

describe('ADMIN_EMAILS', () => {
    it('기본 관리자 이메일이 포함되어 있어야 함', () => {
        expect(ADMIN_EMAILS).toContain('benkorea.ai@gmail.com');
    });
});
