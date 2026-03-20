# 테스트 명세: tests/unit/pages/feedback-query.test.ts

## 대상 구현체

- 페이지: `src/pages/feedback-query.astro`
- 명세: `.spec/src/pages/feedback-query.md`

## 테스트 방식

`fs.readFileSync`로 `feedback-query.astro` 원문을 읽고, 정적 문자열 포함 여부로 요구사항을 검증한다.

## 검증 항목

| describe       | it                   | 검증 내용                                                                                                                            |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| feedback-query | 탭 카운트 span 존재  | `feedbackQueryAllCount`, `feedbackQueryReviewingCount`, `feedbackQueryOnHoldCount`, `feedbackQueryCompletedCount` span id가 존재한다 |
| feedback-query | 리스트 컬럼 헤더     | 테이블 헤더에 `상태`, `제목`, `제출일`이 존재한다                                                                                    |
| feedback-query | 제목 ellipsis        | `.feedback-title`에 `text-overflow: ellipsis`, `white-space: nowrap`, `font-size: 0.85rem`가 지정되어 있다                           |
| feedback-query | 상태는 일반 텍스트   | `.status-text`가 목록 렌더링에 사용된다                                                                                              |
| feedback-query | admin_note 필터      | supabase 조회에서 `admin_note`를 `null`이 아니게 하고(`not('admin_note'` ...), 빈 문자열도 제외(`neq('admin_note'` ...))한다         |
| feedback-query | 상세 모달은 읽기전용 | 모달 내부에 `관리자 메모`가 렌더링된다                                                                                               |
