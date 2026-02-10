
import { persistentMap } from '@nanostores/persistent';
import { getRole, getCertification } from '../config/auth';

export const userProfile = persistentMap('userProfile', {
    id: '',
    login_email: '',
    nickname: '', // Added missing field
    provider: '',
    // 2. Verification Info
    // 2. Verification Info
    verified_date: '', // Renamed from verification_request_date
    verification_type: 'none', // 'none' | 'society_list' | 'admin'
    member_type: 'general', // 'society' | 'special' | 'general'

    society: '', // 'nuclear_medicine' | 'technology'
    affiliation: '',
    department: '',
    society_name: '',
    society_email: '',
    // society_role removed, using classification

    // 3. Safety Management Info
    license_type: 'none',
    is_safety_manager: 'false',
    safety_manager_start_year: '',
    safety_manager_end_year: '',
    safety_manager_start_unknown: 'false',
    is_safety_manager_deputy: 'false',
    is_safety_manager_practical: 'false',

    // 4. System / Meta
    classification: '', // Kept for legacy
    is_approved: 'false', // 'true' | 'false' | 'pending'
    certification: 'none', // Legacy field, might be removable later?
    has_radiation_license: 'false',
    radiation_license_type: 'none'
});

export function setUser(user: {
    id: string,
    email: string,
    login_email?: string,
    provider: string,
    nickname?: string,
    created_at?: string,
    is_admin?: boolean | string,

    verified_date?: string,
    verification_type?: string,
    member_type?: string,

    society?: string,
    affiliation?: string,
    department?: string,
    society_name?: string,
    society_email?: string,
    // society_role?: string,

    license_type?: string,
    is_safety_manager?: boolean,
    safety_manager_start_year?: string,
    safety_manager_end_year?: string,
    safety_manager_start_unknown?: boolean,
    is_safety_manager_deputy?: boolean | string,
    is_safety_manager_practical?: boolean | string,

    classification?: string,
    is_approved?: boolean | string,
    // Legacy mapping arguments
    licenses?: any,
    user_tier?: string,
    is_verified?: boolean | string,
    safety_manager_start_date?: string,
    safety_manager_end_date?: string,
    is_safety_practice_staff?: boolean | string,
    has_radiation_license?: boolean | string,
    radiation_license_type?: string
}) {
    userProfile.set({
        id: user.id || '',
        login_email: user.login_email || user.email || '',
        nickname: user.nickname || '',
        created_at: user.created_at || '',
        is_admin: String(user.is_admin) || 'false',
        provider: user.provider || '',

        verified_date: user.verified_date || '',
        verification_type: user.verification_type || 'none',
        member_type: user.member_type || user.user_tier || 'general',

        society: user.society || '',
        affiliation: user.affiliation || '',
        department: user.department || '',
        society_name: user.society_name || '',
        society_email: user.society_email || '',
        // society_role: user.society_role || '',

        license_type: user.license_type || '', // Needs mapping if old format
        is_safety_manager: String(user.is_safety_manager) || 'false',
        safety_manager_start_year: user.safety_manager_start_year || '',
        safety_manager_end_year: user.safety_manager_end_year || '',
        safety_manager_start_unknown: String(user.safety_manager_start_unknown) || 'false',
        is_safety_manager_deputy: String(user.is_safety_manager_deputy) || 'false',
        is_safety_manager_practical: String(user.is_safety_manager_practical) || 'false',

        classification: user.classification || '',
        is_approved: String(user.is_approved) || 'false',

        // Legacy / Derived defaults
        certification: getCertification(user.email),
        has_radiation_license: String(user.has_radiation_license) || 'false',
        radiation_license_type: user.radiation_license_type || 'none',
        users_licenses: typeof user.licenses === 'string' ? user.licenses : JSON.stringify(user.licenses || [])
    });
}

export function clearUser() {
    userProfile.set({
        id: '',
        login_email: '',
        nickname: '',
        created_at: '',
        is_admin: 'false',
        provider: '',

        verified_date: '',
        verification_type: 'none',
        member_type: 'general',

        society: '',
        affiliation: '',
        department: '',
        society_name: '',
        society_email: '',
        // society_role: '',

        license_type: 'none',
        is_safety_manager: 'false',
        safety_manager_start_year: '',
        safety_manager_end_year: '',
        safety_manager_start_unknown: 'false',
        is_safety_manager_deputy: 'false',
        is_safety_manager_practical: 'false',

        classification: '',
        is_approved: 'false',
        certification: 'none',
        has_radiation_license: 'false',
        radiation_license_type: 'none'
    });
}
