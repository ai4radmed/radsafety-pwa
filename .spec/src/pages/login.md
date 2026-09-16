# 명세: src/pages/login.astro

## 역할 요약

로그인 페이지. 카카오 OAuth, 아이디/비밀번호(UsernamePasswordForm, Stage 1-A), 이메일 6자리 OTP(EmailOtpForm), PUBLIC_DEV_MODE 시 테스트 사용자/관리자 로그인 버튼. 세 로그인 방식이 병존한다(`documents/privacy_redesign_plan.md` 1단계 마이그레이션 A — "더하기": 기존 방식 제거 없이 추가만).

## Props

없음.

## 사이드 이펙트

- Supabase signInWithOAuth, signInWithOtp, signInWithPassword.
- `astro:actions`의 `signUpWithUsername`/`signInWithUsername` (UsernamePasswordForm 경유, `.spec/src/components/auth/UsernamePasswordForm.md` 참조).
- 세션 쿠키 설정.

## 핵심 규칙

1. publicPaths. 미인증 접근 가능.
2. 표시 순서: 카카오 → **아이디/비밀번호(UsernamePasswordForm)** → 이메일 OTP(EmailOtpForm) → (PUBLIC_DEV_MODE) 개발자 로그인. 구분선(`.divider`)으로 섹션을 나눈다.
3. PUBLIC_DEV_MODE=true 시 [테스트 사용자 로그인], [테스트 관리자 로그인], [세션 초기화] 표시.
4. DEV_TEST_USER_EMAIL, DEV_TEST_USER_PASSWORD 등 env 사용.
5. **[iOS PWA 호환성 제약]**: 인증 진행 시 외부 브라우저(Safari 새 창)로의 화면 전환(Redirect)을 발생시켜서는 안 됩니다. 이메일 인증 시 반드시 클릭용 매직링크 방식 대신 **6자리 OTP 코드 입력 방식**을 사용하여 PWA 샌드박스 내부에서 세션이 유지되도록 구현해야 합니다. 아이디/비밀번호 방식도 동일 원칙을 만족(리다이렉트 없이 폼 제출 → `signInWithPassword`로 PWA 내부에서 세션 완결).
