# 명세: src/pages/mypage.astro

## 역할 요약

마이페이지. 로그인 카드(카카오/아이디 배지), 방사선안전관리정보, 인증요청, 프로필 self-healing, 관리자 링크, **회원 탈퇴**.

## 1단계 몫 — 상단 카드 (Stage 1-A, `documents/privacy_redesign_plan.md` §마이페이지)

- **로그인 배지**: 카카오 / **아이디**(구 "이메일 로그인" 배지를 대체 — 내부적으로 이메일 OTP 사용자도 이 배지로 표시돼 "이메일" 개념이 UI에서 사라진다). `currentUser.provider === 'kakao'` 면 카카오 배지 우선(비밀번호를 정한 카카오 사용자도 동일).
- **이름 표시**: `currentUser.username`이 있으면 `@username` 만 표시하고 이메일 자리는 비운다. 아직 username 을 정하지 않은 전환 전 사용자(기존 이메일/카카오)는 종전대로 `real_name`/`nickname` + `login_email` 을 보여준다 — 전환 안내 화면(Stage B)이 아직 없어 강제로 숨기면 식별 수단이 사라지기 때문.
- ADMIN 배지·가입일 표시는 변경 없음.
- 2단계 몫(카드 2·3 구성 변경, 컬럼 삭제, 인증요청 UI 제거)은 이 절 밖 — 아래 "핵심 규칙"·기존 인증요청 섹션은 2단계 전까지 현행 유지.

## Props

없음.

## 사이드 이펙트

- profiles select/update.
- verification_requests insert.
- 인증요청 시 actions.sendVerificationCode 등.
- 회원 탈퇴 시 RPC `delete_own_account` 호출 후 signOut 및 리다이렉트.

## 회원 탈퇴 (계정 삭제)

1. **UI**: "회원 탈퇴" 버튼(`#deleteAccountBtn`) 노출. 버튼은 **모달 밖** 메인 콘텐츠 영역(마이페이지 본문)에 두어 항상 접근 가능해야 함(인증 모달 내부에 두면 탭/모달에 가려져 보이지 않음).
2. **확인**: 클릭 시 `confirm()`으로 경고 문구 표시(되돌릴 수 없음, 게시글은 '알 수 없음' 유지 등). 취소 시 종료.
3. **실행**: `deleteOwnAccount(supabase)` 호출 (명세: `.spec/src/lib/delete-account.md`). 성공 시 `supabase.auth.signOut()` 후 `window.location.href = '/'`.
4. **실패**: 에러 메시지 alert 후 진행 없음.
5. **RPC 계약**: `.spec/sql_query/delete_own_account.md` 참조.

## 핵심 규칙

1. 인증 필요. 프로필 없으면 insert 시도.
2. is_admin 이메일 기반, DB와 불일치 시 update.
3. verification_status: none, list, temp_verified, verified.
