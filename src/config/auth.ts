// 1. Get Admins from Environment Variable (Comma separated)
const ENV_ADMINS = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);

export const ADMIN_EMAILS = [
    ...ENV_ADMINS,
    'benkorea.ai@gmail.com', // Default fallback admin (Resend 테스트 모드에서 사용 가능)
];

export const SPECIAL_GUESTS = ['guest@kins.re.kr'];

// Role Definitions
export const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
} as const;

// Certification Definitions
export const CERTIFICATIONS = {
    KSNM: 'ksnm', // Korean Society of Nuclear Medicine
    KSNMT: 'ksnmt', // Korean Society of Nuclear Medicine Technology
    SPECIAL: 'special',
    NONE: 'none',
} as const;

export function getRole(email: string): 'admin' | 'user' {
    if (!email) return ROLES.USER;
    return ADMIN_EMAILS.includes(email) ? ROLES.ADMIN : ROLES.USER;
}

export function getCertification(email: string): 'ksnm' | 'ksnmt' | 'special' | 'none' {
    if (!email) return CERTIFICATIONS.NONE;
    if (SPECIAL_GUESTS.includes(email)) return CERTIFICATIONS.SPECIAL;

    // Domain-based auto-certification (Example)
    if (email.endsWith('@ksnm.or.kr')) return CERTIFICATIONS.KSNM;
    if (email.endsWith('@ksnmt.or.kr')) return CERTIFICATIONS.KSNMT;

    return CERTIFICATIONS.NONE;
}

export function isAdmin(email: string): boolean {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();
    return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === lowerEmail);
}

// 월간 점검 위저드가 보내는 테스트성 발송물의 제목 접두어
export const MONTHLY_CHECK_PREFIX = '[월간점검]';

/**
 * 의견 이메일 수신자 결정 — 개발자/관리자 수신 분리.
 * 테스트성 의견(제목이 [월간점검] 시작 + 발신자가 관리자)만 개발자 목록으로 라우팅한다.
 * 일반 사용자가 같은 접두어를 써도 관리자 전원에게 정상 전달(실제 의견이 묻히지 않게).
 * developerEmails 는 서버 전용 env 라 호출자가 파싱해 주입한다(이 모듈은 클라이언트에서도 import 됨).
 */
export function resolveFeedbackRecipients(title: string, senderEmail: string, developerEmails: string[]): string[] {
    if (developerEmails.length > 0 && title.startsWith(MONTHLY_CHECK_PREFIX) && isAdmin(senderEmail)) {
        return developerEmails;
    }
    return ADMIN_EMAILS;
}
