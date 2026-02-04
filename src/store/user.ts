
import { persistentMap } from '@nanostores/persistent';
import { getRole, getCertification } from '../config/auth';

export const userProfile = persistentMap('userProfile', {
    id: '',
    email: '',
    full_name: '',
    avatar_url: '',
    provider: '',
    is_approved: 'false', // 'true' | 'false' | 'pending'
    role: 'user', // 'admin' | 'user' (legacy, use user_tier instead)
    certification: 'none', // 'ksnm' | 'ksnmt' | 'special' | 'none' (legacy)
    affiliation: '',
    society: '', // 'nuclear_medicine' | 'technology'
    society_email: '',

    // New fields for manual verification system
    is_admin: 'false', // true if user is admin (separate from user_tier)
    user_tier: 'general', // 'society' | 'special' | 'general'
    licenses: '[]', // JSON string of license array
    is_safety_manager: 'false',
    safety_manager_start_date: '',
    safety_manager_end_date: '',
    joined_at: '',
    society_role: '',
    is_safety_practice_staff: 'false',
    society_name: '',
    department: '',
    is_safety_manager_deputy: 'false',
    has_radiation_license: 'false',
    radiation_license_type: 'none'
});

export function setUser(user: {
    id: string,
    email: string,
    full_name: string,
    avatar_url: string,
    provider: string,
    affiliation?: string,
    society?: string,
    role?: string,
    is_verified?: boolean | string,
    society_email?: string,
    is_admin?: boolean | string,
    user_tier?: string,
    licenses?: any,
    is_safety_manager?: boolean,
    safety_manager_start_date?: string,
    safety_manager_end_date?: string,
    joined_at?: string,
    society_role?: string,
    is_safety_practice_staff?: boolean | string,
    society_name?: string,
    department?: string,
    is_safety_manager_deputy?: boolean | string,
    has_radiation_license?: boolean | string,
    radiation_license_type?: string
}) {
    userProfile.set({
        ...user,
        is_approved: 'true',
        role: user.role || getRole(user.email),
        certification: getCertification(user.email),
        affiliation: user.affiliation || '',
        society: user.society || '',
        is_verified: String(user.is_verified) || 'false',
        society_email: user.society_email || '',
        is_admin: String(user.is_admin) || 'false',
        user_tier: user.user_tier || 'general',
        licenses: typeof user.licenses === 'string' ? user.licenses : JSON.stringify(user.licenses || []),
        is_safety_manager: String(user.is_safety_manager) || 'false',
        safety_manager_start_date: user.safety_manager_start_date || '',
        safety_manager_end_date: user.safety_manager_end_date || '',
        joined_at: user.joined_at || '',
        society_role: user.society_role || '',
        is_safety_practice_staff: String(user.is_safety_practice_staff) || 'false',
        society_name: user.society_name || '',
        department: user.department || '',
        is_safety_manager_deputy: String(user.is_safety_manager_deputy) || 'false',
        has_radiation_license: String(user.has_radiation_license) || 'false',
        radiation_license_type: user.radiation_license_type || 'none'
    });
}

export function clearUser() {
    userProfile.set({
        id: '',
        email: '',
        full_name: '',
        avatar_url: '',
        provider: '',
        is_approved: 'false',
        role: 'user',
        certification: 'none',
        affiliation: '',
        society: '',
        society_email: '',
        is_admin: 'false',
        user_tier: 'general',
        licenses: '[]',
        is_safety_manager: 'false',
        safety_manager_start_date: '',
        safety_manager_end_date: '',
        joined_at: ''
    });
}
