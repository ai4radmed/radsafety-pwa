import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/pages/feedback-query.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('feedback-query.astro', () => {
    it('탭 카운트 span id가 존재한다', () => {
        expect(source).toContain('id="feedbackQueryAllCount"');
        expect(source).toContain('id="feedbackQueryReviewingCount"');
        expect(source).toContain('id="feedbackQueryOnHoldCount"');
        expect(source).toContain('id="feedbackQueryCompletedCount"');
    });

    it('리스트 테이블 헤더는 상태/제목/제출일을 가진다', () => {
        expect(source).toContain('<th>상태</th>');
        expect(source).toContain('<th>제목</th>');
        expect(source).toContain('<th>제출일</th>');
    });

    it('제목은 ellipsis 처리된다', () => {
        expect(source).toContain('class="feedback-title"');
        expect(source).toContain('font-size: 0.85rem');
        expect(source).toContain('text-overflow: ellipsis');
        expect(source).toContain('white-space: nowrap');
    });

    it('목록 상태는 status-text로 렌더링된다', () => {
        expect(source).toContain('class="status-text"');
        expect(source).toContain('.status-text');
    });

    it('admin_note 필터를 사용해 조회한다', () => {
        expect(source).toContain(".not('admin_note'");
        expect(source).toContain(".neq('admin_note'");
    });

    it('상세 모달은 관리자 메모를 렌더링한다', () => {
        expect(source).toContain('관리자 메모');
    });
});
