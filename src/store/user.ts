import { persistentMap } from '@nanostores/persistent';
import { getCertification } from '../config/auth';

// 명세: .spec/src/store/user.md
// 2단계 2-2(2026-09-19): 실명·이메일·닉네임·부서·면허 등 개인정보 필드는 DB 컬럼과 함께 삭제됨.
// 남는 건 아이디·상태·로그인 방식·관리자 여부·소속(기관·학회)뿐이다.
export const userProfile = persistentMap('userProfile', {
    id: '',
    username: '', // Stage 1-A (privacy_redesign_plan.md 1단계) — 아이디/비밀번호 로그인
    status: '', // Phase 2 (2단계 개정 — 2계층+가입승인+제재) — pending/active/suspended/banned
    created_at: '',
    is_admin: 'false',
    provider: '',
    // verification_status 는 2-1(업로드 권한 can_publish) 전까지 업로드 게이트가 참조 — 컬럼도 아직 남아 있다.
    verification_status: 'none',

    society: '', // 'nuclear_medicine' | 'technology' | 'none'
    hospital_id: '',
    hospital_request: '',

    // Legacy / Derived
    certification: 'none',
    has_radiation_license: 'false',
    radiation_license_type: 'none',
    users_licenses: '[]',
});

export function setUser(user: {
    id: string;
    email: string;
    username?: string;
    status?: string;
    provider: string;
    created_at?: string;
    is_admin?: boolean | string;
    verification_status?: string;

    society?: string;
    hospital_id?: string | null;
    hospital_request?: string | null;

    licenses?: any;
    has_radiation_license?: boolean | string;
    radiation_license_type?: string;
}) {
    userProfile.set({
        id: user.id || '',
        username: user.username || '',
        status: user.status || '',
        created_at: user.created_at || '',
        is_admin: String(user.is_admin) || 'false',
        provider: user.provider || '',
        verification_status: user.verification_status || 'none',

        society: user.society || '',
        hospital_id: user.hospital_id || '',
        hospital_request: user.hospital_request || '',

        certification: getCertification(user.email),
        has_radiation_license: String(user.has_radiation_license) || 'false',
        radiation_license_type: user.radiation_license_type || 'none',
        users_licenses: typeof user.licenses === 'string' ? user.licenses : JSON.stringify(user.licenses || []),
    });
}

export function clearUser() {
    userProfile.set({
        id: '',
        username: '',
        status: '',
        created_at: '',
        is_admin: 'false',
        provider: '',
        verification_status: 'none',

        society: '',
        hospital_id: '',
        hospital_request: '',

        certification: 'none',
        has_radiation_license: 'false',
        radiation_license_type: 'none',
        users_licenses: '[]',
    });
}
