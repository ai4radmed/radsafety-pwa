import { describe, it, expect, beforeEach } from 'vitest';
import { userProfile, setUser, clearUser } from '../../../src/store/user';

// 2단계 2-2(2026-09-19): 실명·이메일·닉네임·부서·면허 필드는 DB 컬럼과 함께 스토어에서도 제거됐다.
describe('setUser', () => {
    beforeEach(() => {
        clearUser();
    });

    it('필수 필드가 올바르게 매핑됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
            username: 'tester',
            status: 'active',
        });

        const profile = userProfile.get();
        expect(profile.id).toBe('user-123');
        expect(profile.provider).toBe('kakao');
        expect(profile.username).toBe('tester');
        expect(profile.status).toBe('active');
    });

    it('이메일·닉네임·실명은 스토어에 저장되지 않는다 (2-2)', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            ...({ nickname: '테스터', real_name: '홍길동', login_email: 'x@y.z' } as any),
        });

        const profile = userProfile.get() as Record<string, unknown>;
        expect(profile).not.toHaveProperty('nickname');
        expect(profile).not.toHaveProperty('real_name');
        expect(profile).not.toHaveProperty('login_email');
    });

    it('username 미설정 시 빈 문자열', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
        });

        expect(userProfile.get().username).toBe('');
    });

    it('소속(기관·학회·기관 등록 요청)이 매핑되고 null 은 빈 문자열', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            society: 'nuclear_medicine',
            hospital_id: 'other',
            hospital_request: '새로운병원',
        });
        let profile = userProfile.get();
        expect(profile.society).toBe('nuclear_medicine');
        expect(profile.hospital_id).toBe('other');
        expect(profile.hospital_request).toBe('새로운병원');

        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            hospital_id: null,
            hospital_request: null,
        });
        profile = userProfile.get();
        expect(profile.hospital_id).toBe('');
        expect(profile.hospital_request).toBe('');
    });

    it('boolean is_admin이 string으로 변환됨', () => {
        setUser({
            id: 'user-123',
            email: 'admin@example.com',
            provider: 'email',
            is_admin: true,
        });

        expect(userProfile.get().is_admin).toBe('true');
    });

    it('licenses 배열이 JSON string으로 변환됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            licenses: ['license1', 'license2'],
        });

        expect(userProfile.get().users_licenses).toBe('["license1","license2"]');
    });

    it('licenses가 이미 string이면 그대로 저장', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            licenses: '["existing"]',
        });

        expect(userProfile.get().users_licenses).toBe('["existing"]');
    });

    it('@ksnm.or.kr 이메일은 certification이 ksnm', () => {
        setUser({
            id: 'user-123',
            email: 'doctor@ksnm.or.kr',
            provider: 'email',
        });

        expect(userProfile.get().certification).toBe('ksnm');
    });
});

describe('clearUser', () => {
    it('모든 필드가 초기값으로 리셋됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
            username: 'tester',
            is_admin: true,
            society: 'technology',
            hospital_id: 'other',
        });

        clearUser();

        const profile = userProfile.get();
        expect(profile.id).toBe('');
        expect(profile.username).toBe('');
        expect(profile.is_admin).toBe('false');
        expect(profile.provider).toBe('');
        expect(profile.verification_status).toBe('none');
        expect(profile.society).toBe('');
        expect(profile.hospital_id).toBe('');
        expect(profile.certification).toBe('none');
        expect(profile.users_licenses).toBe('[]');
    });
});
