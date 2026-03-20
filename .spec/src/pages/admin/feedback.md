# 명세: src/pages/admin/feedback.astro

## 역할 요약

관리자 의견 관리 페이지. feedback 테이블 전체 조회, 상태 탭(전체/검토중/보류중/완료), 상세 모달, 상태 변경.

## Props

없음.

## 사이드 이펙트

- feedback select/update (status).

## 핵심 규칙

1. prerender = false.
2. 관리자 가드: astro:page-load 내부에서 처리. **비로그인(user.id 없음)은 가드에서 제외** — DashboardLayout의 auth guard가 /login으로 리다이렉트함.
3. 로그인된 사용자 중 is_admin !== 'true'인 경우에만 alert 후 `/`로 리다이렉트.
4. 상태/제목/모달(보낸사람 포함) 렌더링은 JS로 `innerHTML` 생성되므로, 스타일은 `<style is:global>`로 전역 적용되어야 한다.

5. 상태 탭은 `전체` + `검토중/보류/완료` 3가지 상태로 필터링하며, 탭 라벨에는 각 상태 개수 `(count)`를 괄호 형태로 표시한다.
    - 페이지 로드(loadFeedback) 및 상태 변경(updateStatus)/삭제(deleteFeedback) 후 카운트를 갱신한다.
6. 의견 리스트 테이블(요약 목록)은 3개 컬럼만 상태 순서대로 표시한다.
    - 컬럼 순서: `상태`, `제목`, `제출일`
    - 요약 목록에서는 `첨부파일`은 표시하지 않는다. (상세 모달에서는 기존처럼 첨부를 유지한다.)
7. 요약 목록에서는 `보낸사람`을 표시하지 않는다.
    - `행 클릭(또는 상세 모달 오픈)` 시에만 모달에서 `보낸사람(이름 + 이메일)` 전체가 표시된다.
8. 요약 목록의 `제목`은 `자료실`과 동일하게 너비를 넘치면 `...`로 말줄임 처리한다.
    - 구현상 `feedback.title` 렌더링 노드(.`feedback-title`)에 `overflow:hidden`, `white-space:nowrap`, `text-overflow:ellipsis`를 보장한다.
    - 제목 글자 크기는 `자료실`과 유사하게 `0.85rem`로 낮춘다.
    - iOS에서 ellipsis가 확실히 동작하도록 `table-layout: fixed` + 테이블 2번째 컬럼 폭 고정을 사용한다.
9. 모바일(`max-width: 768px`)에서도 제목 글자 크기 및 말줄임 동작을 유지한다.
    - 구현상 `.feedback-title`에 대한 mobile override가 존재해야 한다.

10. 상태(`상태` 컬럼)는 배지/필터 UI처럼 보이는 pill 형태가 아니라 일반 텍스트처럼 표시한다.
11. `상태` 텍스트는 `...` 처리가 가능해야 하며, 테이블 셀 내부에서 전체 문자열이 최대한 보이도록 폭을 `100%`로 잡아야 한다.

- 구현상 `status-text`에 `width: 100%`와 `overflow: hidden`, `text-overflow: ellipsis`가 지정되어 있어야 한다.
- 또한 `feedback-table`의 첫번째 컬럼(`th/td:nth-child(1)`)에 작은 폭을 주어 `제목` 컬럼이 상태 쪽으로 더 가깝게 표시되도록 한다.

12. 상세 모달에서 `상태`는 `검토중/보류/완료` 3개 라디오(세그먼트)로 선택 가능해야 한다.

- 라디오 3개는 모두 활성화되어야 하며, 현재 상태가 `완료`여도 `검토중`으로 다시 변경할 수 있어야 한다.
- 사용자가 라디오를 선택한 뒤 `상태 저장` 버튼을 눌렀을 때 해당 상태로 DB(`feedback.status`)가 업데이트되어야 한다.
- 세그먼트 라디오는 가로 한 줄로 간결하게 표시되어야 한다(레이아웃은 `flex-wrap: nowrap` 기준).
