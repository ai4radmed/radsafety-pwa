# 명세: src/lib/delete-account.ts

## 역할 요약

브라우저 환경에서 회원 탈퇴 RPC를 호출하는 단일 함수. 마이페이지에서 사용하며, 확인 대화상자·signOut·리다이렉트는 호출측(mypage)에서 처리한다.

## Public API

- **deleteOwnAccount(client)**: `client.rpc('delete_own_account')` 호출 후 `{ error }` 반환. 호출 전 인증 여부는 RPC 측에서 검사.

## 입력

- `client`: Supabase 브라우저 클라이언트 (최소 `rpc(name: string)` 메서드 보유).

## 반환

- `Promise<{ error: Error | null }>`: RPC 성공 시 `{ error: null }`, 실패 시 `{ error }`.

## 사이드 이펙트

- DB: `delete_own_account()` RPC 실행 (auth.users 및 연관 데이터 삭제).

## 핵심 규칙

1. 확인(confirm)·signOut·리다이렉트는 이 모듈이 아닌 페이지/호출측 책임.
2. 단위 테스트에서 Supabase client를 mock하여 rpc 호출 여부 및 반환값 검증.
