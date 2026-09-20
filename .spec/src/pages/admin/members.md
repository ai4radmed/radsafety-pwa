# 명세: src/pages/admin/members.astro

## 역할 요약

**회원 목록**(관리자, 읽기 전용). 2단계 2-2(2026-09-19)에서 옛 "회원명부 등록"(엑셀 업로드 → `allowed_members`)을 대체 — 앱은 명부·실명·이메일을 갖지 않는다. 경로 `/admin/members`·사이드바 항목은 유지하되 라벨을 "회원 목록"으로 바꿈.

## Props

없음.

## 사이드 이펙트

- `profiles` select(`… is_admin, can_publish, reject_count, created_at`, 가입일 내림차순), `hospitals_custom` select(기관 이름 해석).
- `actions.setPublishPermission` 호출(게시 권한 부여/회수). 그 외 쓰기 없음. 승인·거절·기관 등록 요청 처리는 `admin/member-approval.astro`(링크 제공).

## 핵심 규칙

1. **접근 제어**: `is_admin` 만. 비관리자는 alert 후 `/mypage`. `export const prerender = false`.
2. **컬럼**: 아이디(`@username`, 관리자면 `ADMIN` 배지) · 로그인(카카오/아이디) · 소속기관(정적 `HOSPITALS` + `hospitals_custom` 합집합에서 이름, 요청 중이면 `🆕 요청: <기관명>` 배지) · 소속학회 · 상태(`pending`/`active`/`suspended`/`banned` 한글) · 가입일. **실명·이메일 컬럼 없음**(DB에도 없음).
3. **필터**: 아이디 부분일치 검색 + 상태 select. 클라이언트 필터(전체 조회 후) — 수백 명 규모 전제.
4. 사용자 입력·DB 문자열은 `escapeHtml` 로 렌더.
5. **게시 권한 열(2-1, 2026-09-19)** `publishCell`: 관리자/`제출 차단(반려 N회)`/`직접 게시 가능`/`첫 제출 검토 대기` + 반려 누적 배지 + **부여/회수** 버튼(`actions.setPublishPermission`, `confirm()` 후, 알림 발송). 관리자 행에는 버튼 없음. **`banned`·`pending` 행에도 버튼 없음**(2026-09-20 — 로그인 못 하는 계정의 권한 조작은 무의미하고, 비슷한 이름의 거절 계정을 잘못 누른 실사례). 승인·거절은 `member-approval`에서.

## 이력

- 2026-09-19: 2-2 — 엑셀 명부 업로드 페이지 삭제, 회원 목록으로 교체.

## 관리자 열 (2026-09-20)

`상태` 와 `게시 권한` 사이에 `관리자` 열. 셀 = `ADMIN` 배지 또는 `—` + **지정/해제** 버튼(`actions.setAdminRole`, confirm 후). 표 colspan 은 8.

- **본인 행에는 버튼이 없다**(`r.id === currentUser.id`, `(본인)` 표기) — 서버도 자기 해제를 막지만, 실수로 누르는 경로 자체를 없앤다.
- `pending`·`banned` 이면서 관리자가 아닌 행에도 버튼 없음(부여 대상이 아님). 이미 관리자인 비활성 계정은 해제할 수 있다.
- 마지막 관리자 해제는 서버가 거부한다.
