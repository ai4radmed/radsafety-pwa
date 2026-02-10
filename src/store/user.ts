
import { persistentMap } from '@nanostores/persistent';
import { getRole, getCertification } from '../config/auth';

export const userProfile = persistentMap('userProfile', {
    id: '',
    login_email: '',
    nickname: '', // Added missing field
    provider: '',
    // 2. Verification Info
    verification_date: '',
    verification_status: 'none', // 'none' | 'society_list' | 'admin'

    society: '', // 'nuclear_medicine' | 'technology'
    affiliation: '',
    department: '',
    real_name: '',
    society_email: '',

    // 3. Safety Management Info
    license_type: 'none',
    is_safety_manager: 'false',
    safety_manager_start_year: '',
    safety_manager_end_year: '',
    is_safety_manager_deputy: 'false',
    is_safety_manager_practical: 'false',

    // 4. System / Meta
    classification: '',
    certification: 'none',
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

    verification_date?: string,
    verification_status?: string,

    society?: string,
    affiliation?: string,
    department?: string,
    real_name?: string,
    society_email?: string,

    license_type?: string,
    is_safety_manager?: boolean,
    safety_manager_start_year?: string,
    safety_manager_end_year?: string,
    is_safety_manager_deputy?: boolean | string,
    is_safety_manager_practical?: boolean | string,

    classification?: string,
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

        verification_date: user.verification_date || '',
        verification_status: user.verification_status || 'none',

        society: user.society || '',
        affiliation: user.affiliation || '',
        department: user.department || '',
        real_name: user.real_name || user.society_name || '',
        society_email: user.society_email || '',

        license_type: user.license_type || '',
        is_safety_manager: String(user.is_safety_manager) || 'false',
        safety_manager_start_year: user.safety_manager_start_year || '',
        safety_manager_end_year: user.safety_manager_end_year || '',
        is_safety_manager_deputy: String(user.is_safety_manager_deputy) || 'false',
        is_safety_manager_practical: String(user.is_safety_manager_practical) || 'false',

        classification: user.classification || '',

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

        verification_date: '',
        verification_status: 'none',

        society: '',
        affiliation: '',
        department: '',
        real_name: '',
        society_email: '',

        license_type: 'none',
        is_safety_manager: 'false',
        safety_manager_start_year: '',
        safety_manager_end_year: '',
        is_safety_manager_deputy: 'false',
        is_safety_manager_practical: 'false',

        classification: '',
        certification: 'none',
        has_radiation_license: 'false',
        radiation_license_type: 'none'
    });
}
