# 명세: src/pages/claim-username.astro

## 역할 요약

Stage B(`documents/privacy_redesign_plan.md` 전환기간) 강제 중간 페이지. `profiles.username`이 없는 로그인 사용자는 어느 페이지를 가려 했든 `auth-handler.ts`가 이리로 리다이렉트한다. 아이디(+선택/필수 비밀번호)를 정하게 한 뒤 원래 목적지로 돌려보낸다.

## Props

없음.

## 사이드 이펙트

- `astro:actions`의 `claimUsername` 호출(`.spec/src/actions/index.md` 참조).
- 성공 시 `src/lib/last-route.ts`의 `getLastRoute()`로 원래 가려던 경로로 이동(없으면 `/mypage`). `/claim-username` 자체는 `last-route`의 저장 제외 목록에 있어 원래 목적지를 덮어쓰지 않는다.
- 로그아웃 버튼 클릭 시 `supabase.auth.signOut()` → `/login`.

## 핵심 규칙

1. **진입 경로는 `auth-handler.ts`의 강제 리다이렉트뿐**이다 — 사용자가 직접 URL을 쳐서 올 수도 있으나(로그인 상태라면), 이 페이지 자체는 어디서 왔는지 몰라도 동작한다(리다이렉트 전 저장된 `last_route`에 의존).
2. **비밀번호 필수 여부는 `provider`로 판정**: `userProfile.get().provider === 'kakao'`면 선택(건너뛰기 가능, 힌트 텍스트로 이유 설명) — 정하면 이후 아이디/비밀번호로도 같은 계정 로그인 가능(같은 `auth.users.id`). 그 외(이메일 OTP 출신)는 필수 — 클라이언트에서 `required` 속성 + 제출 시 재검증, 안 넣으면 alert 대신 인라인 에러(`#claimMsg`)로 안내.
3. **아이디는 제출 직전 소문자화**(`toLowerCase()`) — `UsernamePasswordForm.astro`와 동일 관례.
4. **완료해도 세션 재로그인 불필요** — `claimUsername`은 `auth.users.email`/`password`만 바꾸고 기존 access token은 그대로 유효하다. 리다이렉트(전체 페이지 이동)가 다음 `astro:page-load`에서 새 `profiles.username`을 다시 읽어 게이트를 통과시킨다.
5. **로그아웃 도피구**: "지금은 로그아웃할게요" 버튼은 항상 노출 — 강제 전환이라도 로그인 자체는 언제든 빠져나갈 수 있어야 한다(아이디 설정을 건너뛰는 게 아니라 세션을 끊는 것).
6. 이 페이지 자체는 `auth-handler.ts`의 게이트 로직에서 제외 대상(`CLAIM_USERNAME_PATH`)이라 무한 리다이렉트 없음.
7. **(Phase 2, 2단계 개정 — 2계층+가입승인+제재)** `userProfile.get().status === 'pending'`인 경우에만 `#newMemberFields`(소속기관 `HospitalAutocomplete` + 소속학회 `#societySelect`)를 노출한다 — 자가 치유로 막 생긴 진짜 신규 계정만 `pending`이고, 기존(전환 전) 사용자는 마이그레이션 기본값 `active`를 그대로 갖고 있어 이 온보딩 질문을 안 받는다. 제출 시에도 `isNewMember`일 때만 `hospitalId`/`society`를 `claimUsername`에 실어 보낸다(필드 자체를 안 보내면 서버가 기존 값을 안 건드림).

## 관련 자산

- 게이트 로직: `src/lib/auth-handler.ts` (`updateUserStore`) — `.spec/src/lib/auth-handler.md`
- 서버 액션: `src/actions/index.ts`의 `claimUsername` — `.spec/src/actions/index.md`
- 스타일·구조 참조: `src/components/auth/UsernamePasswordForm.astro`
- HospitalAutocomplete: `src/components/HospitalAutocomplete.astro` — `.spec/src/components/HospitalAutocomplete.md`
