# 테스트 명세: src/actions/auth.ts · index.ts 인증 전환

## 대상 구현체

- 경로: src/actions/auth.ts, src/actions/index.ts
- 명세: .spec/src/actions/auth.md

## 테스트 도구

Vitest (파일 소스 읽기 기반).

## 검증 항목

| describe                    | it                                                                          | 검증 내용                                                                    |
| --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| actions/auth.ts             | 세션 쿠키로 사용자를 읽고, context 없으면 미인증 거부                       | `createSupabaseServerClient(context.request, context.cookies)`, UNAUTHORIZED |
| index.ts 클라이언트 id 불신 | assertAdmin 소멸, `.eq('id', adminId)`·`input.senderId`·`input.userId` 없음 |                                                                              |
| index.ts 클라이언트 id 불신 | 관리자 액션 8개 — requireAdmin(context)                                     | 핸들러 시그니처에 context                                                    |
| index.ts 클라이언트 id 불신 | 회원 액션 4개 — requireUser(context)                                        |                                                                              |
| index.ts 클라이언트 id 불신 | adminId/senderId/userId 는 optional 로만                                    |                                                                              |
| index.ts 클라이언트 id 불신 | notifySubmission 본인 제출물(또는 관리자)만                                 |                                                                              |
