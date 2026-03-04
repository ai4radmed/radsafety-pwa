# 명세: src/pages/mypage.astro

## 역할 요약

마이페이지. 로그인 카드(카카오/이메일 배지), 방사선안전관리정보, 인증요청, 프로필 self-healing, 관리자 링크, **회원 탈퇴**.

## Props

없음.

## 사이드 이펙트

- profiles select/update.
- verification_requests insert.
- 인증요청 시 actions.sendVerificationCode 등.
- 회원 탈퇴 시 RPC `delete_own_account` 호출 후 signOut 및 리다이렉트.

## 회원 탈퇴 (계정 삭제)

1. **UI**: "회원 탈퇴" 버튼(`#deleteAccountBtn`) 노출.
2. **확인**: 클릭 시 `confirm()`으로 경고 문구 표시(되돌릴 수 없음, 게시글은 '알 수 없음' 유지 등). 취소 시 종료.
3. **실행**: `deleteOwnAccount(supabase)` 호출 (명세: `.spec/src/lib/delete-account.md`). 성공 시 `supabase.auth.signOut()` 후 `window.location.href = '/'`.
4. **실패**: 에러 메시지 alert 후 진행 없음.
5. **RPC 계약**: `.spec/sql_query/delete_own_account.md` 참조.

## 핵심 규칙

1. 인증 필요. 프로필 없으면 insert 시도.
2. is_admin 이메일 기반, DB와 불일치 시 update.
3. verification_status: none, list, temp_verified, verified.
