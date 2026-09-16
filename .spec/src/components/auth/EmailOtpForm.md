# 명세: src/components/auth/EmailOtpForm.astro

## 역할 요약

이메일 6자리 OTP 인증 폼. 1단계: 이메일 입력 → signInWithOtp. 2단계: 6자리 코드 입력 → verifyOtp. PWA 내부에서 세션 유지(리다이렉트 없음).

## Props

없음.

## 사이드 이펙트

- Supabase signInWithOtp(이메일 발송), verifyOtp(세션 생성). 성공 시 동일 창에서 /mypage 이동.

## 핵심 규칙

1. signInWithOtp 호출 시 emailRedirectTo 미사용(6자리 코드 이메일만 발송). Supabase 이메일 템플릿에 `{{ .Token }}` 사용 필요.
   1-1. **(Stage C 준비, 2026-09-16)** `shouldCreateUser: false` — 이미 `auth.users`에 있는 이메일만 로그인·전환 가능하고, 신규 이메일 가입은 거절한다. 목적: `profiles.username`이 없는(=전환 안 된) 계정 목록이 더 늘어나는 것을 막아 Stage C(OTP 완전 제거) 준비를 단순화. 신규 사용자는 카카오 또는 아이디 만들기(`UsernamePasswordForm`)로 유도. 거절 시 Supabase 에러 메시지(`Signups not allowed for otp` 류, `/not allowed/i`로 매칭)를 "등록되지 않은 이메일입니다. 카카오 로그인이나 아이디 만들기를 이용해주세요."로 치환해 보여준다.
2. verifyOtp({ email, token, type: 'email' })로 검증 후 `getLastRoute()`를 확인하여 마지막 방문 경로가 있다면 해당 경로로, 없거나 `/`라면 `/mypage`로 이동.
3. 1단계·2단계 UI 전환은 클라이언트 상태로 처리. 전환의 단일 소스는 `hidden` 속성.
4. `.email-form-wrap`/`.otp-form-wrap` 은 author CSS 로 `display: flex` 를 지정하므로 UA 의 `[hidden] { display: none }` 이 밀려 무력화된다. 반드시 `[hidden]` 셀렉터로 `display: none` 을 명시해 2단계(코드 입력)가 요청 전에 노출되지 않게 한다. (2026-07 월간 점검 위저드가 발견한 실버그)
