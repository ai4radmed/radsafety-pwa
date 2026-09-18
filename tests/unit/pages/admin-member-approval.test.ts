import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/pages/admin/member-approval.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('admin/member-approval.astro', () => {
    it('prerender = false (동적 렌더링)', () => {
        expect(source).toContain('export const prerender = false;');
    });

    it('관리자 가드 — is_admin 아니면 /mypage로 리다이렉트', () => {
        expect(source).toContain("currentUser.is_admin !== 'true'");
        expect(source).toContain("window.location.href = '/mypage'");
    });

    it('profiles.status = pending 목록만 조회한다', () => {
        expect(source).toContain(".eq('status', 'pending')");
    });

    it('승인·거절 액션을 호출한다', () => {
        expect(source).toContain('actions.approvePendingMember');
        expect(source).toContain('actions.rejectPendingMember');
    });

    it('소속기관 표시에 HOSPITALS 목록을 사용한다', () => {
        expect(source).toContain("from '../../data/hospitals'");
        expect(source).toContain('HOSPITALS.find');
    });

    it('빈 목록 안내 문구가 있다', () => {
        expect(source).toContain('대기 중인 가입 신청이 없습니다.');
    });

    // 기관 등록 요청(2026-09-19)
    it('기관 등록 요청 목록 — hospital_request 가 남은 행 전부를 회원 상태와 무관하게 조회', () => {
        expect(source).toContain(".not('hospital_request', 'is', null)");
        expect(source).toContain('처리할 기관 등록 요청이 없습니다.');
    });

    it('등록·거절 모두 resolveHospitalRequest 액션을 호출한다', () => {
        expect(source).toContain('actions.resolveHospitalRequest');
    });

    it("등록 선택지에서 'other' 와 retired 항목을 제외한다", () => {
        expect(source).toContain("!h.retired && h.id !== 'other'");
    });

    it('요청 기관명은 이스케이프해서 렌더한다', () => {
        expect(source).toContain('escapeHtml(row.hospital_request)');
    });
});
