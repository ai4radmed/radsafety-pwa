# 명세: src/components/auth/UsernamePasswordForm.astro

## 역할 요약

아이디/비밀번호 회원가입·로그인 폼. `login.astro`에 카카오와 병존한다. 도입 당시(Stage 1-A)는 이메일 OTP와도 병존했으나, OTP는 Stage C(2026-09-18)로 제거돼 지금은 카카오 외 유일한 로그인 경로다(`documents/privacy_redesign_plan.md` 1단계).

## Props

없음.

## 사이드 이펙트

- `astro:actions`의 `signUpWithUsername`(가입 모드) / `signInWithUsername`(로그인 모드) 호출 — 서버가 `<username>@radsafety.invalid` 파생 이메일을 조회/생성해 반환.
- 반환된 email로 브라우저 `supabase.auth.signInWithPassword({ email, password })` 호출 — 세션 쿠키는 이 호출이 설정한다(서버 액션은 쿠키를 만지지 않음, `.spec/src/actions/index.md` 규칙 8 참조).
- 성공 시 이동: **로그인 모드**는 `../../lib/last-route`의 `getLastRoute()`로 경로 결정(없으면 `/mypage`), **가입 모드**는 항상 `/mypage`(2026-09-18) — 새 계정에는 돌아갈 마지막 경로가 없고, 저장돼 있는 값은 같은 브라우저의 이전 계정(관리자 등)이 남긴 것이라 그리로 보내면 안 된다.

## 핵심 규칙

1. **탭 2개**: `로그인`(기본) / `아이디 만들기`. 탭 전환은 폼을 비우지 않고 제출 버튼 텍스트·`autocomplete`·모드만 바꾼다.
2. **폼 필드는 두 모드 공용**: 아이디 입력창 1개 + 비밀번호 입력창 1개. 클라이언트 `pattern`/`minlength`는 즉시 피드백용 — 최종 검증은 서버(`usernameSchema`, 비밀번호 8자+)가 권위.
3. **로그인 흐름**: `signInWithUsername({ username })` → 반환된 `email`로 `signInWithPassword({ email, password })`. 서버는 비밀번호를 보지 않는다(`.spec/src/actions/index.md` 참조) — 아이디 오탈자든 비밀번호 오류든 Supabase 인증 단계에서 한 번에 걸러지고 사용자에게는 같은 일반 문구로 보인다.
4. **가입 흐름**: `signUpWithUsername({ username, password, hospitalId?, society? })` → 성공 시 반환된 `email`로 곧바로 `signInWithPassword`를 호출해 세션을 연다(가입 직후 자동 로그인, 별도 이메일 확인 절차 없음 — `.invalid` 도메인이라 확인 메일 자체가 불가능).
   4-1. **(Phase 2, 2단계 개정 — 2계층+가입승인+제재)** 가입(`아이디 만들기`) 탭에만 소속기관(`HospitalAutocomplete`)·소속학회(`#societySelect`, `nuclear_medicine`/`technology`/`none`/미선택) 필드가 나타난다 — `#signupOnlyFields`의 `hidden` 속성을 `setMode()`가 토글. 로그인 탭에서는 안 보이고 값도 전송하지 않는다. 둘 다 선택 항목이라 비워도 제출 가능 — `hospitalId`는 항상 보내되(빈 문자열이면 서버가 `null`로 변환), `society`는 값이 있을 때만 키 자체를 보낸다(빈 문자열이 zod enum 검증을 안 통과하므로). **`hospitalRequest`**(2026-09-19)는 `#hospitalRequest`(목록에서 확정하지 않은 타이핑 텍스트)에 값이 있을 때만 보낸다 — 서버가 소속을 `기타`로 두고 관리자 검토용 요청으로 남긴다(`.spec/src/components/HospitalAutocomplete.md` 규칙 3-1).
5. **에러 표시**: 서버 액션 에러(`result.error.message`)와 `signInWithPassword` 에러 모두 같은 `#usernameAuthMsg` 영역에 표시. alert가 아닌 인라인 텍스트(폼 아래 유지되는 다른 인증 수단들과 시각적으로 구분되게).
6. **아이디는 제출 직전 소문자화**(`toLowerCase()`) — 서버도 동일 정규화를 하지만, 클라이언트에서 미리 맞춰 UX 혼선(대문자 입력 시 "가입했는데 로그인 안 됨" 류)을 줄인다.
7. PWA 세션 유지 제약(login.md 규칙 4)과 무관 — 이 폼은 리다이렉트나 외부 브라우저 전환 없이 PWA 내부에서 완결된다.

## 관련 자산

- 서버 액션: `src/actions/index.ts` (`signUpWithUsername`, `signInWithUsername`) — `.spec/src/actions/index.md`
