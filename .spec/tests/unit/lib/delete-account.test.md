# 테스트 명세: src/lib/delete-account.ts

## 대상 구현체

- 경로: src/lib/delete-account.ts
- 명세: .spec/src/lib/delete-account.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe         | it                             | 검증 내용                                         |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| deleteOwnAccount | rpc('delete_own_account') 호출 | mock client의 rpc가 'delete_own_account'로 호출됨 |
| deleteOwnAccount | 성공 시 { error: null } 반환   | rpc가 error null 반환 시 결과도 { error: null }   |
| deleteOwnAccount | 실패 시 { error } 반환         | rpc가 error 반환 시 error.message 포함해 반환     |

## Mock/Setup

- mock client: `{ rpc: vi.fn() }`으로 rpc 반환값 제어.

## 유지보수 목적

- 회원 탈퇴 RPC 호출 계약 검증 및 리팩터 시 회귀 방지.
