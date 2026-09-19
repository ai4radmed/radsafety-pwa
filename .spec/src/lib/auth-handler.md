# 명세: src/lib/auth-handler.ts

## 역할 요약

클라이언트 사이드 인증 및 사용자 상태 관리 핸들러.
Supabase 인증 상태 변경 감지, 프로필 동기화, 알림 체크 및 권한 기반 라우팅 보호를 담당한다.

## 핵심 기능

1. **initAuthHandler()**:
    - `supabase.auth.onAuthStateChange` 리스너 등록.
    - `SIGNED_OUT` 이벤트 발생 시: **`forceClearSupabaseCookies()`**(방어적 쿠키 강제 삭제, 2026-09-16 — `signOut()`이 세션 쿠키 조각 일부를 못 지우는 케이스 대응, `.spec/src/lib/supabase-browser.md` 규칙 6) → `clearUser()` 호출 → 보호된 페이지인 경우 `/login` 리다이렉트.
    - `astro:page-load` 이벤트 등록: 매 페이지 로드 시 `saveLastRoute()`(마지막 경로 저장), 이후 `updateUserStore` 실행.

2. **updateUserStore(session)**:
    - 세션 정보(email, id 등)를 기반으로 기본 유저 정보 설정.
    - `profiles` 테이블에서 상세 프로필 조회 (`maybeSingle`).
    - **자가 치유 (Self-healing)**: 프로필이 없으면 기본 정보로 `profiles`에 자동 생성(`is_admin: false`, **Phase 2부터 `status: 'pending'`**로 시작 — 규칙 6).
    - **관리자 판정 = `profiles.is_admin` 단일 기준** (Stage 1-A, `documents/privacy_redesign_plan.md` 1단계 — `PUBLIC_ADMIN_EMAILS`/`isAdmin()` 이메일 대조 폐지). username 로그인 사용자는 `auth.users.email`이 `<username>@radsafety.invalid` 가짜 값이라 이메일 대조가 원천적으로 성립하지 않음. 관리자 부여는 DB `profiles.is_admin` 직접 갱신으로만 이루어진다.
    - 최종 정보를 `setUser()`를 통해 전역 스토어에 저장.
    - 성공 시 `checkNotifications()` 및 `user:loggedin` 이벤트 발생.
    - `/login` 페이지에서 로그인 성공 시 `/mypage`로 리다이렉트.
    - **(Stage B, 2026-09-16) 아이디 정하기 강제 게이트**: `profiles.username`이 없으면(자가 치유로 막 생긴 신규 계정 포함) 현재 경로가 `/claim-username`이 아닌 한 그 즉시 `/claim-username`으로 리다이렉트하고 나머지 로직(로그인 페이지 이동 등)은 실행하지 않는다. 신규·기존 계정을 구분하지 않는다 — Dr. Ben 결정: 배포 후 첫 접속 시 1회 강제 전환 + 화면 안내로 이유를 설명하는 쪽이 반복 알림·배너보다 사용자 친화적. 리다이렉트 목적지 상수는 `CLAIM_USERNAME_PATH`.

3. **checkNotifications(userId)**:
    - `notifications` 테이블에서 `is_read: false`인 알림 개수 조회.
    - `.global-noti-dot` 요소들의 표시 여부 업데이트.

## 핵심 규칙

1. **보안 가드 (Auth Guard)**:
    - `publicPaths`(2계층 공개 계층, 2026-09-19): `['/', '/login', '/info', '/inspection-prep', '/findings-recommendations', '/resources', '/guide', '/settings', '/offline']` — 접두 매칭. 회원 전용 = 사용자 메뉴(`/mypage`·`/notifications`·`/feedback`·`/my-feedback`·`/feedback-query`·`/claim-username`)와 `/admin/*`.
    - 비인증 사용자가 회원 전용 페이지 접근 시 `/login?from=<경로>` 로 리다이렉트 — 로그인 페이지가 `from` 을 보고 "회원 전용 메뉴" 안내(`#memberOnlyHint`)를 띄운다. 세부 권한(사례 본문 차단·업로드 차단)은 각 페이지 + RLS/열 권한(`sql_query/migrate_public_tier_read.sql`) 담당.
2. **중복 실행 방지**: `astro:page-load` 내에서만 초기화 및 동기화 수행 시 중복 호출 주의.
3. **Optional Guard**: DOM 접근 (`.global-noti-dot`) 시 요소 존재 여부 필수 확인.
4. **(2-2, 2026-09-19) 자가 치유는 `nickname`·`login_email`을 쓰지 않는다** — 두 컬럼 자체가 삭제됐다(`sql_query/migrate_drop_legacy_profile_columns.sql`). 세션의 이메일·닉네임도 `baseUser`에 담지 않는다(앱은 실명·이메일을 갖지 않는다). `provider`는 계속 기록 — 관리자가 다른 사용자의 로그인 방식을 보는 유일한 영속 경로. (Stage C 시절엔 값을 `null`로 비우는 방식이었음.)
5. **(Stage B) 자가 치유 profiles 쓰기는 `upsert(onConflict:'id')`** — `signUpWithUsername`과 같은 이유(운영 DB `auth.users`→`profiles` 자동생성 트리거, `.spec/src/actions/index.md` 규칙 10). 평범한 `insert`는 트리거가 이미 만든 행과 충돌해 자가 치유가 조용히 실패할 수 있다.
6. **(Phase 2, 2단계 개정 — 2계층+가입승인+제재) 자가 치유는 항상 `status: 'pending'`으로 시작** — 자가 치유는 `profiles` 행이 아예 없을 때만 실행되므로, 이 함수가 실행됐다는 것 자체가 "진짜 신규 계정"이라는 뜻이다(기존 사용자는 이미 행이 있어 이 분기를 안 탄다). 기존(마이그레이션 이전) 사용자는 `sql_query/migrate_add_member_status_hospital.sql`의 컬럼 기본값 `'active'`를 그대로 유지 — 이 함수가 건드리지 않는다.
