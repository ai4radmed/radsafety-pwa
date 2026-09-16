import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 마이페이지 카드 2("파일업로드 등 권한인증 및 소속정보")가 실명·실제 이메일을
 * 다시 노출하지 않는지 검증(2026-09-16). 카드 1(로그인 배지·아이디)이 이미 신원을
 * 아이디로만 표시하도록 바뀐 뒤에도, 바로 아래 카드가 real_name/society_email/
 * login_email 을 보여주면 그 취지가 무의미해진다.
 */
const PAGE_PATH = path.resolve('src/pages/mypage.astro');

describe('mypage 카드 2 — 실명·이메일 미표시', () => {
    it('userRealName/userSocietyEmail DOM 요소를 두지 않는다', () => {
        const content = fs.readFileSync(PAGE_PATH, 'utf-8');
        expect(content).not.toContain('id="userRealName"');
        expect(content).not.toContain('id="userSocietyEmail"');
    });

    it('스크립트에서 real_name/society_email 값을 화면에 대입하지 않는다', () => {
        const content = fs.readFileSync(PAGE_PATH, 'utf-8');
        expect(content).not.toContain("getElementById('userRealName')");
        expect(content).not.toContain("getElementById('userSocietyEmail')");
    });

    it('학회·구분·기관·부서(소속 단위 정보)는 그대로 유지한다', () => {
        const content = fs.readFileSync(PAGE_PATH, 'utf-8');
        expect(content).toContain('id="userSocietyName"');
        expect(content).toContain('id="userSocietyRole"');
        expect(content).toContain('id="userAffiliation"');
        expect(content).toContain('id="userDepartment"');
    });
});
