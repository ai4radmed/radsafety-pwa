import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 2-1 업로드 권한 — 자료실·지적사례·제출 검토·회원 목록·마이페이지가 verification_status 대신
 * status/can_publish/reject_count 게이트를 쓰는지 소스 계약으로 고정한다(2026-09-19).
 */
const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');
const resources = read('src/pages/resources.astro');
const findings = read('src/pages/findings-recommendations.astro');
const submissions = read('src/pages/admin/submissions.astro');
const members = read('src/pages/admin/members.astro');
const mypage = read('src/pages/mypage.astro');
const sidebar = read('src/components/Sidebar.astro');

describe('2-1 업로드 권한 게이트', () => {
    it('자료실·지적사례는 verification_status 를 더 이상 보지 않고 status/reject_count 로 게이트한다', () => {
        for (const src of [resources, findings]) {
            expect(src).not.toContain('verification_status');
            expect(src).toContain("currentUser.status === 'active'");
            expect(src).toContain('reject_count');
        }
    });

    it('자료실: pending 파일은 비공개 버킷 <uid>/ 아래, 서명 URL 로 열고, 삭제는 버킷을 따른다', () => {
        expect(resources).toContain("'resources-pending'");
        expect(resources).toContain('`${currentUser.id}/${baseName}`');
        expect(resources).toContain('createSignedUrl(fileUrl, 60 * 60)');
        expect(resources).toContain("from(item.file_bucket || 'resources').remove");
        expect(resources).toContain('file_bucket: targetBucket');
    });

    it('자료실: 파일 규칙(20MB·허용 형식·매크로/실행파일 차단) + 저작권·개인정보 확인란', () => {
        expect(resources).toContain('20 * 1024 * 1024');
        // prettier 가 배열을 여러 줄로 재배치하므로 토큰 단위로 확인
        for (const ext of ["'docm'", "'xlsm'", "'pptm'", "'exe'"]) expect(resources).toContain(ext);
        expect(resources).toContain('id="writeConsent"');
        expect(resources).toContain('validateUploadFile(file)');
    });

    it('자료실·지적사례: pending/rejected 배지와 제출 안내(검토 후 게시)', () => {
        expect(resources).toContain('status-badge pending');
        expect(findings).toContain('status-badge pending');
        expect(resources).toContain('관리자 검토 후 게시');
        expect(findings).toContain('관리자 검토 후 게시');
        // 게시된 자료만 API 로 바로 연다
        expect(resources).toContain("item?.status === 'published'");
    });

    it('제출 검토 페이지: pending 자료·사례 조회, reviewSubmission 승인/반려, 관리자 가드', () => {
        expect(submissions).toContain("eq('status', 'pending')");
        expect(submissions).toContain('actions.reviewSubmission');
        expect(submissions).toContain("currentUser.is_admin !== 'true'");
        expect(submissions).toContain('export const prerender = false;');
        expect(sidebar).toContain('/admin/submissions');
    });

    it('회원 목록: 게시 권한 표시 + setPublishPermission 토글', () => {
        expect(members).toContain('can_publish, reject_count');
        expect(members).toContain('actions.setPublishPermission');
        expect(members).toContain('첫 제출 검토 대기');
    });

    it('마이페이지 카드 2: 업로드 권한 행', () => {
        expect(mypage).toContain('id="userPublishStatus"');
        expect(mypage).toContain('직접 게시 가능');
    });
});
