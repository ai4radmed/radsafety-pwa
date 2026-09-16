# 명세: src/lib/auth-handler.ts

## 역할 요약

클라이언트 사이드 인증 및 사용자 상태 관리 핸들러.
Supabase 인증 상태 변경 감지, 프로필 동기화, 알림 체크 및 권한 기반 라우팅 보호를 담당한다.

## 핵심 기능

1. **initAuthHandler()**:
    - `supabase.auth.onAuthStateChange` 리스너 등록.
    - `SIGNED_OUT` 이벤트 발생 시: `clearUser()` 호출 및 보호된 페이지인 경우 `/login` 리다이렉트.
    - `astro:page-load` 이벤트 등록: 매 페이지 로드 시 `saveLastRoute()`(마지막 경로 저장), 이후 `updateUserStore` 실행.

2. **updateUserStore(session)**:
    - 세션 정보(email, id 등)를 기반으로 기본 유저 정보 설정.
    - `profiles` 테이블에서 상세 프로필 조회 (`maybeSingle`).
    - **자가 치유 (Self-healing)**: 프로필이 없으면 기본 정보로 `profiles`에 자동 생성(`is_admin: false`로 시작).
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
    - `publicPaths`: `['/', '/login']` (서브 경로 포함 대응 필요).
    - 비인증 사용자가 보호된 페이지 접근 시 즉시 `/login` 리다이렉트.
2. **중복 실행 방지**: `astro:page-load` 내에서만 초기화 및 동기화 수행 시 중복 호출 주의.
3. **Optional Guard**: DOM 접근 (`.global-noti-dot`) 시 요소 존재 여부 필수 확인.
4. **(Stage B) 자가 치유 시 카카오는 nickname·login_email 을 비운다** — provider가 `kakao`면 `newProfile.login_email`/`nickname`을 `null`로 강제(그 외 provider는 기존대로 `baseUser`값 사용). 이메일 OTP 사용자는 전환 전까지 `login_email`이 유일한 로그인 식별자라 그대로 유지해야 한다.
5. **(Stage B) 자가 치유 profiles 쓰기는 `upsert(onConflict:'id')`** — `signUpWithUsername`과 같은 이유(운영 DB `auth.users`→`profiles` 자동생성 트리거, `.spec/src/actions/index.md` 규칙 10). 평범한 `insert`는 트리거가 이미 만든 행과 충돌해 자가 치유가 조용히 실패할 수 있다.
