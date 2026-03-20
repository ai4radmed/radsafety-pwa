import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/pages/admin/feedback.astro');
const source = fs.readFileSync(filePath, 'utf-8');

describe('admin/feedback.astro', () => {
    it('JS로 생성되는 innerHTML에도 CSS가 적용되도록 is:global 스타일을 사용한다', () => {
        expect(source).toContain('<style is:global>');
    });

    it('상태 탭 카운트 span id가 존재한다', () => {
        expect(source).toContain('id="feedbackAllCount"');
        expect(source).toContain('id="feedbackReviewingCount"');
        expect(source).toContain('id="feedbackOnHoldCount"');
        expect(source).toContain('id="feedbackCompletedCount"');
    });

    it('리스트 테이블 헤더는 상태/제목/제출일만 가진다', () => {
        expect(source).toContain('<th>상태</th>');
        expect(source).toContain('<th>제목</th>');
        expect(source).toContain('<th>제출일</th>');

        // 헤더에서 첨부파일 컬럼이 제거되어야 한다.
        expect(source).not.toContain('<th>첨부파일</th>');
        expect(source).not.toContain('<th>보낸사람</th>');
    });

    it('리스트 제목은 feedback-title 클래스(0.85rem)로 렌더링된다', () => {
        expect(source).toContain('.feedback-title');
        expect(source).toContain('font-size: 0.85rem;');
        expect(source).toContain('class="feedback-title">${feedback.title}');
    });

    it('모바일에서는 feedback-title이 0.85rem으로 내려간다', () => {
        expect(source).toContain('@media (max-width: 768px)');
        expect(source).toContain('.feedback-title');
        expect(source).toContain('font-size: 0.85rem;');
    });

    it('목록에서는 보낸사람이 표시되지 않는다', () => {
        // markup checks (CSS class definitions may still exist)
        expect(source).not.toContain('<div class="feedback-sender-trigger');
        expect(source).not.toContain('<div class="feedback-sender feedback-sender-hidden');
    });

    it('제목 셀은 overflow ellipsis 처리한다', () => {
        expect(source).toContain('.feedback-title');
        expect(source).toContain('text-overflow: ellipsis');
        expect(source).toContain('white-space: nowrap');
        expect(source).toContain('word-break: keep-all');
        // table layout should be fixed to respect widths
        expect(source).toContain('table-layout: fixed');
        // title column width is fixed for iOS ellipsis
        expect(source).toContain('th:nth-child(2)');
        expect(source).toContain('td:nth-child(2)');
        expect(source).toContain('width: 220px');
    });

    it('상태는 배지 대신 텍스트로 표시한다', () => {
        // list row uses status-text instead of status-badge
        expect(source).toContain('.status-text');
    });

    it('상태 컬럼은 넓어진 폭 기준으로 제한되고 말줄임이 된다', () => {
        expect(source).toContain('.feedback-table th:nth-child(1)');
        expect(source).toContain('.feedback-table td:nth-child(1)');
        expect(source).toContain('width: 85px');
        expect(source).toContain('width: 100%');
        expect(source).toContain('text-overflow: ellipsis');
    });

    it('상세 모달에서 상태는 라디오 세그먼트로 선택한다', () => {
        expect(source).toContain('name="feedbackStatusRadio"');
        expect(source).toContain('id="feedbackStatusReviewingRadio"');
        expect(source).toContain('id="feedbackStatusOnHoldRadio"');
        expect(source).toContain('id="feedbackStatusCompletedRadio"');
        expect(source).toContain('id="saveStatusBtn"');
    });

    it('상세 모달 상태 세그먼트는 가로 한 줄 표시된다', () => {
        expect(source).toContain('.status-radio-group');
        expect(source).toContain('flex-wrap: nowrap');
    });
});
