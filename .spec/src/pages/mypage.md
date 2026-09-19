# 명세: src/pages/mypage.astro

## 역할 요약

마이페이지. 2단계 2-2(`documents/privacy_redesign_plan.md`, 2026-09-19) 이후 구성: **카드 1**(로그인 배지·ADMIN 배지·`@username`·가입일) + **카드 2**(소속 정보 — 소속기관·소속학회, 편집·저장) + **회원 탈퇴**. 옛 인증요청 UI(명부 대조·앱관리자 인증요청·특별사용자 모달), 안전관리면허·방안관리자 카드, 실명·이메일·닉네임·부서·구분 표시는 전부 제거됐다(컬럼도 삭제 — `.spec/sql_query/migrate_drop_legacy_profile_columns.md`).

## Props

없음.

## 사이드 이펙트

- `userProfile` 스토어 구독(렌더). `hospitals_custom` select(커스텀 기관 이름 해석, anon 읽기).
- 소속 저장: `actions.updateAffiliation({ userId, hospitalId, hospitalRequest?, society|null })` (`.spec/src/actions/index.md` 규칙 16) → 성공 시 스토어 갱신.
- 회원 탈퇴: `deleteOwnAccount(supabase)` → `signOut` → `/`.

## 카드 1 — 신원 (Stage 1-A/B 규칙 유지)

- **로그인 배지**: `provider === 'kakao'` 면 카카오, 아니면 아이디 배지.
- **이름**: `@username`. username 없는 사용자는 `auth-handler.ts` 가 `/claim-username` 으로 보내므로 정상 경로에서는 항상 있다(폴백 문구 `(아이디 미설정)`).
- ADMIN 배지(`is_admin`), 가입일(`created_at`). 이메일 자리는 없다(`#userIdentityEmail` 제거).

## 카드 2 — 소속 정보 (2-2)

1. **필드**: `HospitalAutocomplete`(`.spec/src/components/HospitalAutocomplete.md` — `#hospitalQuery`·`#hospitalId`·`#hospitalRequest`) + `#societySelect`(`nuclear_medicine`/`technology`/`none`/미선택) + `#saveAffiliationBtn`. 둘 다 선택 항목.
2. **프리필**: 스토어에서 계정당 1회(`prefilledFor`) — `hospital_id` 가 있고 `'other'` 가 아니면 이름을 정적 `HOSPITALS` → `c-` 접두면 `hospitals_custom` → id 순으로 해석해 `#hospitalQuery` 에 넣고 `#hospitalId` 를 채운다. `hospital_request` 가 남아 있으면 그 텍스트를 `#hospitalQuery`·`#hospitalRequest` 에 넣고 `#hospitalRequestNote`("…등록 요청이 관리자 검토 중") 를 보인다. `'other'` 면 `기타`.
    - 계정당 1회인 이유: 사용자가 편집 중인 값을 스토어 갱신(알림 폴링 등)이 덮지 않도록.
3. **저장**: `updateAffiliation` 호출 — 가입 폼과 같은 규칙(확정 id 는 검증 후 저장, 확정 안 된 타이핑 텍스트는 `기타` + 등록 요청 + 관리자 알림). `society` 는 미선택이면 `null` 로 지운다. 성공 시 스토어를 응답값으로 갱신하고 `prefilledFor` 를 초기화해 저장값으로 다시 프리필.
4. 안내 문구: 소속은 본인 마이페이지·관리자 화면에서만 보이고 작성자 표시·자료 목록에는 아이디만 쓰인다(계획서 2-2).

## 회원 탈퇴 (계정 삭제)

1. **UI**: "회원 탈퇴" 버튼(`#deleteAccountBtn`) — 본문 하단, 항상 접근 가능.
2. **확인**: `confirm()` 경고(되돌릴 수 없음, 게시글은 '알 수 없음' 유지). 취소 시 종료.
3. **실행**: `deleteOwnAccount(supabase)` (`.spec/src/lib/delete-account.md`). 성공 시 `signOut` 후 `/`.
4. **실패**: alert.
5. **RPC 계약**: `.spec/sql_query/delete_own_account.md`.

## 핵심 규칙

1. 인증 필요(DashboardLayout 가드). 프로필 자가 치유는 `auth-handler.ts` 몫.
2. `is_admin` 은 `profiles.is_admin` 단일 기준(Stage 1-A).
3. 이 페이지는 삭제된 컬럼(`real_name`·`login_email`·`nickname`·`society_email`·`affiliation`·`department`·`classification`·`license_type`·`is_safety_manager`·`safety_manager_*`·`verification_date`)을 어디에도 참조하지 않는다 — `tests/unit/pages/mypage-privacy.test.ts` 가 소스 문자열로 고정.
4. 업로드 권한 표시(계획서 2-2 카드 2 "업로드 권한" 행)는 2-1(`can_publish`) 구현 시 추가.

## 이력

- 2026-09-16: 카드 2에서 실명·이메일·구분·부서 표시 제거.
- 2026-09-18: Stage C(OTP 제거) — "아이디 로그인" 배지.
- 2026-09-19 오전: 카드 1에 소속 한 줄 임시 표시(hotfix) → 같은 날 2-2 로 카드 2 로 이동·편집 가능.
- 2026-09-19: 2-2 — 인증요청 UI·모달·안전관리 카드 삭제, 소속 정보 카드 신설.
