# 테스트 명세: tests/unit/pages/admin-feedback.test.ts

## 대상 구현체

- 페이지: `src/pages/admin/feedback.astro`
- 명세: `.spec/src/pages/admin/feedback.md`

## 테스트 방식

`fs.readFileSync`로 `admin/feedback.astro` 원문을 읽고, 정적 문자열 포함 여부로 요구사항을 검증한다.

## 검증 항목

| describe       | it                                        | 검증 내용                                                                                                                                                   |
| -------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin-feedback | 탭 카운트 span 존재                       | `feedbackAllCount`, `feedbackReviewingCount`, `feedbackOnHoldCount`, `feedbackCompletedCount` span id가 존재한다                                            |
| admin-feedback | 리스트 컬럼 3개/순서 유지                 | 테이블 헤더에 `상태`, `제목`, `제출일`이 존재하고 `보낸사람`은 헤더에 존재하지 않는다                                                                       |
| admin-feedback | 제목 글자 크기 보장                       | `feedback-title` 클래스가 존재하며 `font-size: 0.85rem`을 지정한다                                                                                          |
| admin-feedback | 모바일 제목 글자 크기                     | `@media (max-width: 768px)`에서 `.feedback-title`의 `font-size: 0.85rem` 오버라이드가 존재한다                                                              |
| admin-feedback | 제목 오버플로우 말줄임                    | `.feedback-title`에 `text-overflow: ellipsis`, `white-space: nowrap`, `word-break: keep-all`이 지정되어 있다                                                |
| admin-feedback | 상태는 일반 텍스트로 표시                 | 목록 렌더링에서 `.status-text`가 사용된다                                                                                                                   |
| admin-feedback | 상태 컬럼 폭 제한                         | `.feedback-table th:nth-child(1)` 및 `td:nth-child(1)`에 `width: 85px`가 지정되어 있다                                                                      |
| admin-feedback | 상태 말줄임 처리                          | `.status-text`에 `width: 100%`와 `text-overflow: ellipsis`가 지정되어 있다                                                                                  |
| admin-feedback | 테이블 레이아웃 고정                      | `.feedback-table`에 `table-layout: fixed`가 지정되어 있다                                                                                                   |
| admin-feedback | 제목 컬럼 폭 고정                         | `.feedback-table th:nth-child(2)` 및 `td:nth-child(2)`에 `width: 220px`가 지정되어 있다                                                                     |
| admin-feedback | 리스트 렌더링에서 제목 렌더링             | 리스트 렌더링 부분에서 `feedback.title`이 `class="feedback-title"`로 렌더링되는 문자열이 존재한다                                                           |
| admin-feedback | 리스트 렌더링에서는 보낸사람 미표시       | `<th>보낸사람</th>` 및 `<div class="feedback-sender-trigger">` 문자열이 존재하지 않는다                                                                     |
| admin-feedback | 상세 모달 상태 선택은 라디오 세그먼트     | `name="feedbackStatusRadio"` 및 3개 라디오 input id(`feedbackStatusReviewingRadio`, `feedbackStatusOnHoldRadio`, `feedbackStatusCompletedRadio`)가 존재한다 |
| admin-feedback | 상세 모달 상태 저장 버튼 존재             | `id="saveStatusBtn"` 문자열이 존재한다                                                                                                                      |
| admin-feedback | 상세 모달 상태 세그먼트는 가로 한 줄 표시 | `.status-radio-group`에 `flex-wrap: nowrap`이 지정되어 있다                                                                                                 |
