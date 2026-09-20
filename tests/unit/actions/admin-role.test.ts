import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 관리자 지정/해제(`setAdminRole`)와 비밀번호 변경(`changePassword`)의 안전장치를 소스 수준에서 고정.
 * 명세: .spec/src/actions/index.md · .spec/src/pages/admin/members.md · .spec/src/pages/mypage.md
 */
const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');
const IDX = read('src/actions/index.ts');
const MEMBERS = read('src/pages/admin/members.astro');
const MYPAGE = read('src/pages/mypage.astro');
const SERVER = read('src/lib/supabase-server.ts');

function block(name: string): string {
    const start = IDX.indexOf(`${name}: defineAction(`);
    expect(start, `${name} 액션이 없다`).toBeGreaterThan(-1);
    const rest = IDX.slice(start);
    const end = rest.search(/\n {4}\w+: defineAction\(/);
    return end === -1 ? rest : rest.slice(0, end);
}

describe('setAdminRole — 관리자 지정/해제', () => {
    const body = block('setAdminRole');

    it('관리자만 호출할 수 있다(세션 기준)', () => {
        expect(body).toMatch(/await requireAdmin\(context\)/);
        expect(body).not.toMatch(/adminId/);
    });

    it('자기 자신의 권한은 해제할 수 없다', () => {
        expect(body).toMatch(/targetUserId === admin\.id && !isAdmin/);
        expect(body).toMatch(/자기 자신의 관리자 권한은 해제할 수 없습니다/);
    });

    it('마지막 관리자는 해제할 수 없다', () => {
        expect(body).toMatch(/count: 'exact', head: true/);
        expect(body).toMatch(/\.eq\('is_admin', true\)/);
        expect(body).toMatch(/마지막 관리자는 해제할 수 없습니다/);
    });

    it('active 회원에게만 부여하고, 같은 값이면 멱등 반환', () => {
        expect(body).toMatch(/isAdmin && target\.status !== 'active'/);
        expect(body).toMatch(/Boolean\(target\.is_admin\) === isAdmin/);
    });

    it('대상에게 알림 1건, 알림 실패는 처리 결과를 바꾸지 않는다', () => {
        expect(body).toMatch(/createNotification\(/);
        expect(body).toMatch(/관리자 권한이 부여되었습니다/);
        expect(body).toMatch(/logger\.warn\('관리자 권한 알림 실패/);
    });
});

describe('changePassword — 비밀번호 변경', () => {
    const body = block('changePassword');

    it('로그인 사용자 본인만(세션), 대상 지정 입력이 없다', () => {
        expect(body).toMatch(/await requireUser\(context\)/);
        expect(body).not.toMatch(/targetUserId/);
    });

    it('아이디 계정은 현재 비밀번호로 재인증해야 한다', () => {
        expect(body).toMatch(/if \(!kakaoOnly\)/);
        expect(body).toMatch(/현재 비밀번호를 입력해 주세요/);
        expect(body).toMatch(/signInWithPassword\(/);
        expect(body).toMatch(/현재 비밀번호가 일치하지 않습니다/);
    });

    it('재인증은 1회성 클라이언트로 — 공유 anon 세션을 건드리지 않는다', () => {
        expect(body).toMatch(/createAnonClient\(\)/);
        expect(SERVER).toMatch(/export function createAnonClient\(\)/);
    });

    it('카카오 전용 계정은 현재 비밀번호 없이 최초 설정', () => {
        expect(body).toMatch(/profile\?\.provider === 'kakao'/);
    });

    it('아이디 변경 기능은 제공하지 않는다(액션·입력 모두 없음)', () => {
        // 아이디는 작성자 표시의 식별자 — 바뀌면 과거 게시물 추적이 끊긴다(2026-09-20 Dr. Ben).
        expect(IDX).not.toMatch(/changeUsername/);
        expect(MYPAGE).not.toMatch(/changeUsername|id="usernameInput"/);
    });
});

describe('화면 배선', () => {
    it('회원 목록 — 관리자 열, 본인 행엔 버튼 없음, 비활성 계정엔 부여 버튼 없음', () => {
        expect(MEMBERS).toMatch(/<th>관리자<\/th>/);
        expect(MEMBERS).toMatch(/function adminCell/);
        expect(MEMBERS).toMatch(/r\.id === currentUser\.id/);
        expect(MEMBERS).toMatch(/inactive && !r\.is_admin/);
        expect(MEMBERS).toMatch(/actions\.setAdminRole\(/);
        expect(MEMBERS).toMatch(/colspan="8"/);
    });

    it('마이페이지 — 비밀번호 카드, 카카오면 현재 비밀번호 칸 숨김', () => {
        expect(MYPAGE).toMatch(/id="passwordCard"/);
        expect(MYPAGE).toMatch(/actions\.changePassword\(/);
        expect(MYPAGE).toMatch(/pwCurrentRow\.hidden = kakaoOnly/);
        expect(MYPAGE).toMatch(/8자 이상/);
    });
});
