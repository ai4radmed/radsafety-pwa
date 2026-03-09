# 테스트 명세: src/components/auth/EmailOtpForm.astro

## 대상 구현체

- 경로: src/components/auth/EmailOtpForm.astro
- 명세: .spec/src/components/auth/EmailOtpForm.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe          | it                                                 | 검증 내용                                                                    |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| EmailOtpForm 파일 | 구현체 파일이 존재해야 한다                        | src/components/auth/EmailOtpForm.astro 존재                                  |
| 1단계 UI          | 이메일 요청 폼 및 입력 요소가 정의되어 있어야 한다 | id="emailOtpRequestForm", id="emailOtpEmail", id="emailOtpRequestBtn" 포함   |
| 2단계 UI          | OTP 검증 폼 및 6자리 입력이 정의되어 있어야 한다   | id="emailOtpVerifyForm", id="emailOtpCode", maxlength="6", type="email" 검증 |
| signInWithOtp     | emailRedirectTo를 사용하지 않아야 한다 (PWA 호환)  | 소스에 signInWithOtp 포함, emailRedirectTo 미포함                            |
| verifyOtp         | type: 'email'로 검증해야 한다                      | verifyOtp 호출 및 type: 'email' 포함                                         |
| 성공 시 이동      | 검증 성공 시 마지막 경로 또는 /mypage으로 이동해야 한다 | getLastRoute 유틸 사용 여부 및 동적 라우팅 조건문 포함 검증 |

## Mock/Setup

- 파일 소스 읽기 기반 검증. Supabase/브라우저 모킹 불필요.

## 기존 테스트 참조

- tests/unit/pages/auth.test.ts (파일·소스 검증 패턴)
