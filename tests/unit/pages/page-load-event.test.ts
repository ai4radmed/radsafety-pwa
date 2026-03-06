import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * astro:page-load 리스너 존재 검증
 *
 * View Transitions 재방문 시 동적 데이터 로딩 페이지에서
 * astro:page-load 리스너가 없으면 스크립트가 미재실행됨 (codebase_guide.md)
 */

const SRC_DIR = path.resolve('src');

/** astro:page-load 리스너가 필수인 파일 (동적 데이터 로딩) */
const REQUIRED_PAGE_LOAD_FILES = [
    'pages/index.astro',
    'pages/feedback.astro',
    'pages/mypage.astro',
    'pages/resources.astro',
    'pages/inspection-prep.astro',
    'pages/findings-recommendations.astro',
    'pages/settings.astro',
    'pages/notifications.astro',
    'pages/my-feedback.astro',
    'pages/admin/members.astro',
    'pages/admin/verification-requests.astro',
    'pages/admin/glossary.astro',
    'pages/admin/feedback.astro',
    'pages/admin/send-notification.astro',
    'components/Sidebar.astro',
    'components/ChecklistItem.astro',
    'components/GlossaryModal.astro',
    'components/Lightbox.astro',
    'components/LoginGuide.astro',
    'layouts/DashboardLayout.astro',
];

describe('astro:page-load 리스너 검증', () => {
    it('동적 데이터 로딩 페이지에 astro:page-load가 있어야 한다', () => {
        const violations: string[] = [];

        for (const relPath of REQUIRED_PAGE_LOAD_FILES) {
            const fullPath = path.join(SRC_DIR, relPath);
            if (!fs.existsSync(fullPath)) {
                violations.push(`${relPath} (파일 없음)`);
                continue;
            }

            const content = fs.readFileSync(fullPath, 'utf-8');
            const hasPageLoad = /astro:page-load/.test(content);
            if (!hasPageLoad) {
                violations.push(relPath);
            }
        }

        expect(
            violations,
            `astro:page-load 누락 파일:\n${violations.join('\n')}\n\n새 페이지 추가 시 REQUIRED_PAGE_LOAD_FILES 목록 갱신 필요`,
        ).toEqual([]);
    });
});
