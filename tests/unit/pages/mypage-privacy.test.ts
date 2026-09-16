import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 마이페이지 카드 2("파일업로드 등 권한인증 및 소속정보")가 실명·실제 이메일·
 * 구분·부서를 노출하지 않는지 검증(2026-09-16, 구분·부서는 같은 날 재검토 후 추가
 * 제거). 카드 1(로그인 배지·아이디)이 이미 신원을 아이디로만 표시하도록 바뀐 뒤에도,
 * 바로 아래 카드가 real_name/society_email/login_email/classification/department 를
 * 보여주면 그 취지가 무의미해진다. 2026-09-10 KSNM 방안위 교육팀 합의 회의록 원칙
 * (앱은 실명·이메일·명부를 갖지 않는다, 가입 시 소속기관·소속학회만 수집)에 따라
 * 학회·기관만 남긴다.
 */
const PAGE_PATH = path.resolve('src/pages/mypage.astro');

describe('mypage 카드 2 — 실명·이메일·구분·부서 미표시', () => {
    it('userRealName/userSocietyEmail/userSocietyRole/userDepartment DOM 요소를 두지 않는다', () => {
        const content = fs.readFileSync(PAGE_PATH, 'utf-8');
        expect(content).not.toContain('id="userRealName"');
        expect(content).not.toContain('id="userSocietyEmail"');
        expect(content).not.toContain('id="userSocietyRole"');
        expect(content).not.toContain('id="userDepartment"');
    });

    it('스크립트에서 real_name/society_email/classification/department 값을 화면에 대입하지 않는다', () => {
        const content = fs.readFileSync(PAGE_PATH, 'utf-8');
        expect(content).not.toContain("getElementById('userRealName')");
        expect(content).not.toContain("getElementById('userSocietyEmail')");
        expect(content).not.toContain("getElementById('userSocietyRole')");
        expect(content).not.toContain("getElementById('userDepartment')");
    });

    it('학회·기관(소속 단위 정보)만 그대로 유지한다', () => {
        const content = fs.readFileSync(PAGE_PATH, 'utf-8');
        expect(content).toContain('id="userSocietyName"');
        expect(content).toContain('id="userAffiliation"');
    });
});
