# 테스트 명세: src/actions/index.ts

## 대상 구현체

- 경로: src/actions/index.ts
- 명세: .spec/src/actions/index.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe                   | it                                                              | 검증 내용                                        |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| server.deleteFinding       | local- 접두사 id는 DB 삭제 없이 성공 반환                       | handler({ id: 'local-xxx' }) → { success: true } |
| server.deleteFinding       | local- 아닌 id는 supabaseAnon.delete 호출                       | mock으로 delete 호출 여부 검증                   |
| server.saveFinding         | id 없으면 insert 호출                                           | mock으로 insert 호출 검증                        |
| server.saveFinding         | id가 local-로 시작하면 insert 호출                              | mock으로 insert 호출 검증                        |
| server.saveFinding         | id가 local- 아닌 기존 id면 update 호출                          | mock으로 update 호출 검증                        |
| server                     | saveFinding, deleteFinding, sendVerificationCode 등 액션 export | server 객체에 필수 액션 키 존재                  |
| server.approveVerification | 관리자 권한 확인 후 profiles/verification_requests 업데이트     | mockAdmin.update 호출 및 success 반환            |
| server.rejectVerification  | 관리자 권한 확인 후 profiles/verification_requests 업데이트     | mockAdmin.update 호출 및 success 반환            |
| server.revokeVerification  | 관리자 권한 확인 후 profiles/verification_requests 업데이트     | mockAdmin.update 호출 및 success 반환            |
| server.\*Verification      | 관리자가 아니면 에러 반환                                       | is_admin false인 경우 Error throw                |

## Mock/Setup

- vi.mock('../lib/supabase-server') - supabaseAnon, supabaseAdmin
- vi.mock('../lib/email'), vi.mock('../lib/push'), vi.mock('../config/auth')
- defineAction의 handler만 추출하여 직접 호출 (또는 server 액션 invoke)

## 유지보수 목적

- deleteFinding local- 가드: 클라이언트 임시 id 처리
- saveFinding insert/update 분기: id 유무 및 local- 판별
- 액션 구조 변경 시 회귀 방지
