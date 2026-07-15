import { describe, it, expect } from 'vitest';
import {
    getRole,
    getCertification,
    isAdmin,
    resolveFeedbackRecipients,
    ADMIN_EMAILS,
    ROLES,
    CERTIFICATIONS,
} from '../../../src/config/auth';

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

describe('ROLES', () => {
    it('ADMIN, USER 상수가 정의되어 있어야 함', () => {
        expect(ROLES.ADMIN).toBe('admin');
        expect(ROLES.USER).toBe('user');
    });
});

describe('CERTIFICATIONS', () => {
    it('KSNM, KSNMT, SPECIAL, NONE 상수가 정의되어 있어야 함', () => {
        expect(CERTIFICATIONS.KSNM).toBe('ksnm');
        expect(CERTIFICATIONS.KSNMT).toBe('ksnmt');
        expect(CERTIFICATIONS.SPECIAL).toBe('special');
        expect(CERTIFICATIONS.NONE).toBe('none');
    });
});

describe('resolveFeedbackRecipients', () => {
    const devs = ['dev1@example.com', 'dev2@example.com'];
    const adminSender = 'benkorea.ai@gmail.com'; // ADMIN_EMAILS 기본 포함

    it('[월간점검] 제목 + 관리자 발신은 개발자 목록으로만 라우팅', () => {
        const result = resolveFeedbackRecipients('[월간점검] 의견 발송 테스트', adminSender, devs);
        expect(result).toEqual(devs);
    });

    it('[월간점검] 제목이라도 일반 사용자 발신은 관리자 전원에게', () => {
        const result = resolveFeedbackRecipients('[월간점검] 흉내낸 제목', 'user@example.com', devs);
        expect(result).toEqual(ADMIN_EMAILS);
    });

    it('일반 제목은 관리자 발신이어도 관리자 전원에게', () => {
        const result = resolveFeedbackRecipients('로그인 오류 문의', adminSender, devs);
        expect(result).toEqual(ADMIN_EMAILS);
    });

    it('개발자 목록이 비어 있으면 관리자 전원(안전 기본값)', () => {
        const result = resolveFeedbackRecipients('[월간점검] 테스트', adminSender, []);
        expect(result).toEqual(ADMIN_EMAILS);
    });

    it('접두어는 제목 시작 위치만 인정', () => {
        const result = resolveFeedbackRecipients('의견 [월간점검] 아님', adminSender, devs);
        expect(result).toEqual(ADMIN_EMAILS);
    });
});
