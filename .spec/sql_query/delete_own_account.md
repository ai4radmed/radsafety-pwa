# 명세: delete_own_account() RPC

## 역할 요약

인증된 사용자가 자신의 계정만 삭제할 수 있는 Supabase RPC. `rebuild_all_tables.sql` 내에 정의되어 있으며, SECURITY DEFINER로 `auth.users` 삭제 권한을 가진다.

## 계약

- **함수명**: `delete_own_account`
- **입력**: 없음 (현재 사용자 = `auth.uid()`)
- **반환**: `void`
- **동작**: `DELETE FROM auth.users WHERE id = auth.uid();`
- **권한**: `SECURITY DEFINER` (호출자 권한이 아닌 함수 소유자 권한으로 실행)

## 사이드 이펙트

- `auth.users`에서 해당 행 삭제.
- `profiles.id`가 `auth.users(id) ON DELETE CASCADE`이므로 profiles 행 자동 삭제.
- 기타 `REFERENCES auth.users(id) ON DELETE CASCADE` 테이블(예: push_subscriptions) 자동 삭제.
- `ON DELETE SET NULL` 참조(예: feedback.user_id)는 NULL로 갱신.

## 호출처

- 클라이언트: 마이페이지 회원 탈퇴 버튼 → `supabase.rpc('delete_own_account')` (인증된 세션 필요).

## 핵심 규칙

1. 인증되지 않은 호출은 실패한다.
2. 삭제 후 클라이언트는 반드시 `signOut()` 후 리다이렉트해야 한다.
