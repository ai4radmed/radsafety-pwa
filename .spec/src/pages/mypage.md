# 명세: src/pages/mypage.astro

## 역할 요약

마이페이지. 로그인 카드(카카오/아이디 배지), 방사선안전관리정보, 인증요청, 프로필 self-healing, 관리자 링크, **회원 탈퇴**.

## 1단계 몫 — 상단 카드 (Stage 1-A, `documents/privacy_redesign_plan.md` §마이페이지)

- **로그인 배지**: 카카오 / **아이디**(구 "이메일 로그인" 배지를 대체 — 내부적으로 이메일 OTP 사용자도 이 배지로 표시돼 "이메일" 개념이 UI에서 사라진다). `currentUser.provider === 'kakao'` 면 카카오 배지 우선(비밀번호를 정한 카카오 사용자도 동일).
- **이름 표시**: `currentUser.username`이 있으면 `@username` 만 표시하고 이메일 자리는 비운다. **(Stage B, `/claim-username` 강제 게이트 도입 이후)** 로그인된 사용자는 항상 username 을 갖고 이 페이지에 도달한다 — username 없이는 auth-handler.ts 가 이 페이지 자체를 못 보게 `/claim-username`으로 돌려보낸다. `real_name`/`nickname` + `login_email` 폴백 분기는 그 게이트가 아직 없던 시절의 방어 코드로 남아 있을 뿐, 정상 경로에서는 도달하지 않는다.
- ADMIN 배지·가입일 표시는 변경 없음.
- **(2026-09-16 추가) 카드 2("파일업로드 등 권한인증 및 소속정보")에서 실명·실제 이메일 표시 제거**: `#userRealName`·`#userSocietyEmail` 요소와 그 값 대입 코드를 삭제. 이유 — 카드 1이 이미 아이디로만 신원을 노출하도록 바뀌었는데, 바로 아래 카드에서 `real_name`/`society_email`(또는 `login_email` 폴백)을 다시 보여주면 그 취지가 무의미해진다.
- **(2026-09-16 재검토 후 추가 제거) `구분`(`#userSocietyRole`)·`부서`(`#userDepartment`) 표시도 제거**: 2026-09-10 KSNM 방안위 교육팀 합의 회의록(`2nd-brain-vault/knowledge/02_areas/대한핵의학회/방사선안전위원회/2026-09-10_...md`) 원칙 — "앱은 실명·이메일·명부를 갖지 않는다", 가입 시 "소속기관(목록)·소속학회만 선택" — 에 따라, 구분·부서는 옛 회원명부 대조 기반 인증 모델의 잔재이자 새 최소수집 설계에 없는 필드라 카드 2에는 `학회`·`기관` 두 줄만 남긴다. `currentUser.classification`/`.department` 값 자체와 인증요청 모달(구분·부서 입력 필드 포함)은 안 건드림 — 그 흐름 전체의 재설계는 여전히 2단계 몫.
- **인증요청 흐름 자체(모달·`verification_requests` insert·`society_email`/`real_name`/`classification`/`department` 수집)는 이번에도 안 건드림** — 신청 시 이 필드들을 입력받는 것 자체의 재설계는 2단계(`verification_status`→`can_publish` 전환) 몫.
- 2단계 몫(카드 2·3 구성 변경, 인증요청 UI 자체의 제거)은 이 절 밖 — 위 표시 제거를 넘어선 구조 변경은 2단계 전까지 보류.

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
