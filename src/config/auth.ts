// 1. Get Admins from Environment Variable (Comma separated)
const ENV_ADMINS = (import.meta.env.PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);

export const ADMIN_EMAILS = [
    ...ENV_ADMINS,
    "kimbi@kirams.re.kr", // Added for Admin Access
    "dev@example.com", // Fallback/Dev
    "admin@radsafety.com",
    "ben@example.com"
];

export const SPECIAL_GUESTS = [
    "guest@kins.re.kr"
];

// Role Definitions
export const ROLES = {
    ADMIN: 'admin',
    USER: 'user'
} as const;

// Certification Definitions
export const CERTIFICATIONS = {
    KSNM: 'ksnm',   // Korean Society of Nuclear Medicine
    KSNMT: 'ksnmt', // Korean Society of Nuclear Medicine Technology
    SPECIAL: 'special',
    NONE: 'none'
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
    return ADMIN_EMAILS.includes(email);
}
