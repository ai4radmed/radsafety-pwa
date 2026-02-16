import { describe, it, expect, beforeEach } from 'vitest';
import { userProfile, setUser, clearUser } from '../../../src/store/user';

describe('setUser', () => {
    beforeEach(() => {
        clearUser();
    });

    it('필수 필드가 올바르게 매핑됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
            nickname: '테스터',
        });

        const profile = userProfile.get();
        expect(profile.id).toBe('user-123');
        expect(profile.login_email).toBe('test@example.com');
        expect(profile.provider).toBe('kakao');
        expect(profile.nickname).toBe('테스터');
    });

    it('login_email이 있으면 email보다 우선', () => {
        setUser({
            id: 'user-123',
            email: 'login@example.com',
            login_email: 'actual@example.com',
            provider: 'email',
        });

        const profile = userProfile.get();
        expect(profile.login_email).toBe('actual@example.com');
    });

    it('society_name 레거시 필드가 real_name으로 폴백', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
            society_name: '홍길동',
        });

        const profile = userProfile.get();
        expect(profile.real_name).toBe('홍길동');
    });

    it('real_name이 있으면 society_name보다 우선', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
            real_name: '실제이름',
            society_name: '학회이름',
        });

        const profile = userProfile.get();
        expect(profile.real_name).toBe('실제이름');
    });

    it('boolean is_admin이 string으로 변환됨', () => {
        setUser({
            id: 'user-123',
            email: 'admin@example.com',
            provider: 'email',
            is_admin: true,
        });

        const profile = userProfile.get();
        expect(profile.is_admin).toBe('true');
    });

    it('boolean is_safety_manager가 string으로 변환됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            is_safety_manager: true,
        });

        const profile = userProfile.get();
        expect(profile.is_safety_manager).toBe('true');
    });

    it('licenses 배열이 JSON string으로 변환됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            licenses: ['license1', 'license2'],
        });

        const profile = userProfile.get();
        expect(profile.users_licenses).toBe('["license1","license2"]');
    });

    it('licenses가 이미 string이면 그대로 저장', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'email',
            licenses: '["existing"]',
        });

        const profile = userProfile.get();
        expect(profile.users_licenses).toBe('["existing"]');
    });

    it('@ksnm.or.kr 이메일은 certification이 ksnm', () => {
        setUser({
            id: 'user-123',
            email: 'doctor@ksnm.or.kr',
            provider: 'email',
        });

        const profile = userProfile.get();
        expect(profile.certification).toBe('ksnm');
    });
});

describe('clearUser', () => {
    it('모든 필드가 초기값으로 리셋됨', () => {
        setUser({
            id: 'user-123',
            email: 'test@example.com',
            provider: 'kakao',
            nickname: '테스터',
            is_admin: true,
        });

        clearUser();

        const profile = userProfile.get();
        expect(profile.id).toBe('');
        expect(profile.login_email).toBe('');
        expect(profile.nickname).toBe('');
        expect(profile.is_admin).toBe('false');
        expect(profile.provider).toBe('');
        expect(profile.verification_status).toBe('none');
        expect(profile.certification).toBe('none');
        expect(profile.users_licenses).toBe('[]');
    });
});
