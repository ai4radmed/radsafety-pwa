# 명세: src/pages/login.astro

## 역할 요약

로그인 페이지. 카카오 OAuth, 아이디/비밀번호(UsernamePasswordForm, Stage 1-A), PUBLIC_DEV_MODE 시 테스트 사용자/관리자 로그인 버튼. 이메일 6자리 OTP(EmailOtpForm)는 Stage C(2026-09-18, `documents/privacy_redesign_plan.md` 1단계 마이그레이션 C)로 제거됨 — 아이디/비밀번호가 유일한 비-OAuth 로그인 경로.

## Props

없음.

## 사이드 이펙트

- Supabase signInWithOAuth, signInWithPassword.
- `astro:actions`의 `signUpWithUsername`/`signInWithUsername` (UsernamePasswordForm 경유, `.spec/src/components/auth/UsernamePasswordForm.md` 참조).
- 세션 쿠키 설정.

## 핵심 규칙

1. publicPaths. 미인증 접근 가능.
2. 표시 순서: 카카오 → **아이디/비밀번호(UsernamePasswordForm)** → (PUBLIC_DEV_MODE) 개발자 로그인. 구분선(`.divider`)으로 섹션을 나눈다.
3. PUBLIC_DEV_MODE=true 시 [테스트 사용자 로그인], [테스트 관리자 로그인], [세션 초기화] 표시.
4. DEV_TEST_USER_EMAIL, DEV_TEST_USER_PASSWORD 등 env 사용.
5. **[iOS PWA 호환성 제약]**: 인증 진행 시 외부 브라우저(Safari 새 창)로의 화면 전환(Redirect)을 발생시켜서는 안 됩니다. 아이디/비밀번호 방식은 리다이렉트 없이 폼 제출 → `signInWithPassword`로 PWA 내부에서 세션이 완결돼 이 원칙을 만족한다(과거 이메일 OTP가 하던 역할을 이제 이 경로가 담당).

## 회원 전용 메뉴 안내 (2026-09-19)

- `auth-handler.ts`가 회원 전용 경로에서 튕길 때 `/login?from=<경로>`로 보낸다. 페이지의 별도 `<script>`가 `from` 쿼리가 있으면 `#memberOnlyHint`("이 메뉴는 회원 전용입니다…")를 보인다. 그 외 로그인 흐름 변경 없음.
