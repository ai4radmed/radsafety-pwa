# 명세: src/pages/feedback-query.astro

## 역할 요약

일반 사용자가 “관리자가 검토 후 관리자 의견을 남긴 접수”만 조회하는 페이지.
관리자 화면(`src/pages/admin/feedback.astro`)과 유사하게 상태 탭/요약 테이블/상세 모달을 제공하되 **수정 기능은 없다**.

## Props

없음.

## 사이드 이펙트

- feedback select (읽기 전용)

## 핵심 규칙

1. prerender = false. 인증 필요 (DashboardLayout + auth-handler redirect).
2. Supabase 조회는 다음 조건으로 제한한다.
    - `admin_note`가 `NULL`이 아니고(`IS NOT NULL`)
    - `admin_note`가 빈 문자열이 아니어야 함(`<> ''`)
3. 상태 탭은 `전체` + `검토중/보류/완료` 3개 라벨로 필터링한다.
    - 탭 라벨에는 각 상태 개수 `(count)`를 괄호 형태로 표시한다.
4. 요약 목록 테이블(요약 목록)은 3개 컬럼을 상태 순서대로 표시한다.
    - 컬럼 순서: `상태`, `제목`, `제출일`
5. 요약 목록의 `제목`은 너비를 넘치면 `...`로 말줄임 처리한다.
    - 구현상 `feedback-title`에 `overflow:hidden`, `white-space:nowrap`, `text-overflow:ellipsis`를 보장한다.
    - iOS에서 ellipsis가 확실히 동작하도록 `table-layout: fixed` + 타이틀 컬럼 폭 고정을 사용한다.
6. `상태`는 배지/필터 UI처럼 보이는 pill 형태가 아니라 일반 텍스트처럼 표시한다 (`status-text`).
7. 상세 모달에는 다음 항목이 **읽기 전용**으로 표시된다.
    - 제목, 보낸사람(이름+이메일), 제출일, 상태, 내용, 관리자 메모(`admin_note`), 첨부파일 목록(다운로드 버튼 없음)
