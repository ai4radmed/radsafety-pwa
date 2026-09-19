import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 마이페이지가 개인정보(실명·이메일·닉네임·부서·구분·면허)를 노출하거나 옛 인증요청 UI를
 * 남기지 않는지 검증. 2단계 2-2(2026-09-19): profiles 개인정보 컬럼·명부/인증 테이블 삭제와
 * 함께 마이페이지는 카드 1(배지·아이디·가입일) + 카드 2(소속 정보: 기관·학회, 편집 가능) +
 * 회원 탈퇴만 남긴다. 2026-09-10 KSNM 방안위 교육팀 합의(앱은 실명·이메일·명부를 갖지 않는다).
 */
const PAGE_PATH = path.resolve('src/pages/mypage.astro');
const content = fs.readFileSync(PAGE_PATH, 'utf-8');

describe('mypage — 개인정보 미표시·옛 인증 UI 제거 (2-2)', () => {
    it('삭제된 컬럼(실명·이메일·닉네임·부서·구분·면허)을 어디에도 참조하지 않는다', () => {
        for (const col of [
            'real_name',
            'society_email',
            'login_email',
            'nickname',
            'department',
            'classification',
            'license_type',
            'is_safety_manager',
            'safety_manager_start_year',
            'safety_manager_end_year',
            'verification_date',
        ]) {
            expect(content, col).not.toContain(col);
        }
        // 'affiliation' 은 새 카드 2 의 식별자(.affiliation-form, updateAffiliation)에 쓰이므로
        // 옛 컬럼 참조 형태만 금지한다.
        expect(content).not.toContain('currentUser.affiliation');
        expect(content).not.toContain('userData.affiliation');
        expect(content).not.toContain('name="affiliation"');
    });

    it('옛 인증요청 UI·모달·명부 대조·안전관리면허 카드가 없다', () => {
        expect(content).not.toContain('id="verifyModal"');
        expect(content).not.toContain('id="toggleVerifyBannerBtn"');
        expect(content).not.toContain("from('allowed_members')");
        expect(content).not.toContain("from('verification_requests')");
        expect(content).not.toContain('sendVerificationCode');
        expect(content).not.toContain('id="radLicenseSelect"');
        expect(content).not.toContain('id="managerToggle"');
    });

    it('카드 1은 아이디·가입일·배지만, 카드 2는 소속 정보(기관 자동완성·학회 select·저장)', () => {
        expect(content).toContain('id="userIdentityName"');
        expect(content).toContain('id="userJoinedAt"');
        expect(content).toContain('id="adminBadge"');
        expect(content).not.toContain('id="userIdentityEmail"');
        expect(content).toContain('<HospitalAutocomplete />');
        expect(content).toContain('id="societySelect"');
        expect(content).toContain('id="saveAffiliationBtn"');
        expect(content).toContain('actions as any).updateAffiliation');
    });

    it('커스텀 기관(c-)은 hospitals_custom 에서 이름을 찾고, 등록 요청 중이면 안내한다', () => {
        expect(content).toContain(".from('hospitals_custom')");
        expect(content).toContain('id="hospitalRequestNote"');
    });

    it('회원 탈퇴는 남는다', () => {
        expect(content).toContain('id="deleteAccountBtn"');
        expect(content).toContain('deleteOwnAccount(supabase)');
    });
});
