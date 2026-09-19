# 명세: src/pages/admin/members.astro

## 역할 요약

**회원 목록**(관리자, 읽기 전용). 2단계 2-2(2026-09-19)에서 옛 "회원명부 등록"(엑셀 업로드 → `allowed_members`)을 대체 — 앱은 명부·실명·이메일을 갖지 않는다. 경로 `/admin/members`·사이드바 항목은 유지하되 라벨을 "회원 목록"으로 바꿈.

## Props

없음.

## 사이드 이펙트

- `profiles` select(`id, username, provider, status, society, hospital_id, hospital_request, is_admin, created_at`, 가입일 내림차순), `hospitals_custom` select(기관 이름 해석).
- 쓰기 없음. 승인·거절·기관 등록 요청 처리는 `admin/member-approval.astro`(링크 제공).

## 핵심 규칙

1. **접근 제어**: `is_admin` 만. 비관리자는 alert 후 `/mypage`. `export const prerender = false`.
2. **컬럼**: 아이디(`@username`, 관리자면 `ADMIN` 배지) · 로그인(카카오/아이디) · 소속기관(정적 `HOSPITALS` + `hospitals_custom` 합집합에서 이름, 요청 중이면 `🆕 요청: <기관명>` 배지) · 소속학회 · 상태(`pending`/`active`/`suspended`/`banned` 한글) · 가입일. **실명·이메일 컬럼 없음**(DB에도 없음).
3. **필터**: 아이디 부분일치 검색 + 상태 select. 클라이언트 필터(전체 조회 후) — 수백 명 규모 전제.
4. 사용자 입력·DB 문자열은 `escapeHtml` 로 렌더.
5. 계획서 2-2 "업로드 권한·반려 횟수" 열은 2-1(`can_publish`/`reject_count`) 구현 시 추가.

## 이력

- 2026-09-19: 2-2 — 엑셀 명부 업로드 페이지 삭제, 회원 목록으로 교체.
