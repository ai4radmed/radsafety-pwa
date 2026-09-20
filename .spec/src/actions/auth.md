# 명세: src/actions/auth.ts

## 역할 요약

액션 공용 인증 — **세션 쿠키가 권위**. 2026-09-20 전환: 그전까지 `index.ts` 의 관리자·회원 액션은 클라이언트가 보낸 `adminId`/`userId`/`senderId` 를 믿고 `profiles.is_admin` 만 대조했다(관리자 UUID 를 아는 사람이 API 를 직접 호출하면 관리자 동작 가능). 제안 채널(`proposals.ts`)에서 먼저 세션 기준으로 만들었고, 같은 날 나머지 전부를 전환했다.

## Public API

| 함수                              | 동작                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `requireUser(context, {active?})` | `createSupabaseServerClient(context.request, context.cookies).auth.getUser()` → `profiles(is_admin, status)` → `{id, isAdmin, status}`. 없으면 `UNAUTHORIZED`. `active:true` 면 status≠active 에 `FORBIDDEN`. **context 가 없으면(테스트·내부 호출) 미인증으로 거부** — 조용히 통과시키지 않는다 |
| `requireAdmin(context)`           | `requireUser` 뒤 `isAdmin` 아니면 `FORBIDDEN`                                                                                                                                                                                                                                                    |

## 적용 (index.ts)

| 액션                                                                                                                                                                              | 판정                                                   | 비고                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `sendNotification`·`reviewBulletin`·`reviewSubmission`·`setPublishPermission`·`approvePendingMember`·`rejectPendingMember`·`resolveHospitalRequest`·`registerHospitalFromRequest` | `requireAdmin(context)`                                | `adminId`/`senderId` 입력은 optional 로만 남김(하위 호환) — **값은 무시**, 세션 id 를 쓴다 |
| `sendFeedback`·`claimUsername`·`updateAffiliation`                                                                                                                                | `requireUser(context)`                                 | `userId` 입력 무시, 세션 id. `claimUsername` 은 pending 계정도 통과(첫 접속 게이트)        |
| `notifySubmission`                                                                                                                                                                | `requireUser(context)` + 본인 제출물(또는 관리자)만    | 이전엔 인증 없음                                                                           |
| `submitProposal` 등(proposals.ts)                                                                                                                                                 | `requireUser(context, {active:true})` / `requireAdmin` | 제안은 active 회원만                                                                       |
| `saveFinding`·`deleteFinding`·`signUpWithUsername`·`signInWithUsername`                                                                                                           | 변경 없음                                              | 앞 둘은 `supabaseAnon` 경유(RLS 적용)·호출처 없음, 뒤 둘은 로그인 자체                     |

## 핵심 규칙

1. **화면은 바꾸지 않는다** — 페이지가 `adminId: currentUser.id` 를 계속 보내도 무해(무시). 이후 정리 시 제거 가능.
2. 테스트는 `src/actions/auth` 를 모의하되 **같은 supabase-server 모의의 profiles 조회를 타게** 해 기존 mock 호출 순서를 보존한다(`session.userId` 가 로그인한 사람). 정적 테스트 `tests/unit/actions/session-auth.test.ts` 가 "클라이언트 id 불신"을 소스 수준에서 고정.
3. e2e(`authenticated-admin.spec.ts` 등)는 실제 세션 쿠키로 액션을 호출하므로 전환 회귀를 잡는다.

## 관련

- `.spec/src/actions/index.md` 규칙 12(개정) · `.spec/src/actions/proposals.md`
