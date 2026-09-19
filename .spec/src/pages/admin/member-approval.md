# 명세: src/pages/admin/member-approval.astro

## 역할 요약

Phase 3(2계층+가입승인+제재 모델, `documents/privacy_redesign_plan.md` — 2026-09-10 KSNM 방안위 교육팀 합의 승계). `profiles.status = 'pending'`인 신규 가입 계정을 관리자가 조회·승인·거절하는 화면. 2026-09-16 신설.

기존 `admin/verification-requests.astro`(`verification_status` 기반 학회 인증 관리)와는 **다른 화면·다른 목적**이다 — 그쪽은 학회 명부 대조로 회원 자격을 확인하는 옛 모델, 이 화면은 그 명부 대조를 폐지하고 대체한 새 최소수집 가입승인 모델. `admin/members.astro`(회원명부 엑셀 업로드)도 옛 모델의 잔재로, 두 옛 화면은 이번 작업에서 건드리지 않았다(향후 정리 대상, 별도 결정 필요).

## Props

없음.

## 사이드 이펙트

- `profiles` select (status='pending' 목록 조회 / `hospital_request IS NOT NULL` 목록 조회), `hospitals_custom` select(표시·합치기 후보).
- `actions.approvePendingMember` / `actions.rejectPendingMember` / `actions.resolveHospitalRequest` / `actions.registerHospitalFromRequest` 호출 (`.spec/src/actions/index.md` 참조).

## 핵심 규칙

1. **접근 제어**: `is_admin` 권한이 있는 사용자만 접근 가능. 비로그인은 DashboardLayout 가드가 `/login`으로 리다이렉트. 로그인했지만 비관리자는 alert 후 `/mypage`로 리다이렉트 (verification-requests.astro와 동일 관례).
2. **동적 렌더링**: `export const prerender = false`.
3. **목록 조회**: `profiles.status = 'pending'` 인 행만 `created_at` 오름차순(먼저 가입한 순)으로 표시. 컬럼 — 아이디(`username`), 로그인 방식(`provider === 'kakao'` ? 카카오 : 아이디), 소속학회(`society` → 한글명 매핑, 없으면 '없음'/'-'), 소속기관(`hospital_id` → `HOSPITALS`(`src/data/hospitals.ts`)에서 이름 조회, 못 찾으면 id 그대로 표시), 가입일. `profiles.provider` 컬럼은 이 화면과 같은 PR에서 처음 select 됐으나 DB에 신설되지 않은 채 배포돼 "column profiles.provider does not exist" 로드 실패를 냈다(2026-09-18 프리뷰 실측) — `sql_query/migrate_add_profile_provider.sql`로 수리.
4. **승인**: `승인` 버튼 → `confirm()` → `approvePendingMember({ adminId, targetUserId })` → 성공 시 목록 새로고침(해당 행이 사라짐, `status`가 `active`로 바뀌었으므로).
5. **거절**: `거절` 버튼 → `confirm()`(재가입 안내 문구 포함) → `rejectPendingMember({ adminId, targetUserId })` → 성공 시 목록 새로고침. `status`는 `banned`로 처리 — 스키마에 "가입 거절" 전용 상태가 없어 기존 4개 값 중 재사용(재가입은 새 계정으로).
6. **빈 목록**: "대기 중인 가입 신청이 없습니다." 안내 문구.
7. 알림(`notifications` 테이블 insert)은 가입 승인/거절에는 없음 — `verification-requests.astro`와 달리 사용자에게 별도 알림을 보내지 않는다(범위 최소화, 필요해지면 추가). 기관 등록 요청 처리(규칙 8)는 예외 — 서버 액션이 알림을 보낸다.
8. **기관 등록 요청 목록(2026-09-19, 개정 2로 배포 없이 처리)**: 같은 화면 하단에 두 번째 표. `profiles.hospital_request IS NOT NULL`인 행을 **회원 상태와 무관하게** 전부 조회한다(가입 승인이 먼저 끝나 위 표에서 사라져도 요청은 남아야 하므로). 컬럼 — 아이디, 회원 상태, 가입일, 처리. 처리 셀은 두 줄:
    - **등록**: 요청 기관명이 미리 채워진 `input.request-name`(관리자가 고칠 수 있음, 2~60자) + "이 이름으로 등록" → `registerHospitalFromRequest({adminId, targetUserId, name})`. 서버가 `hospitals_custom`에 행을 만들고(정적 목록과 표기만 다르면 그 기관으로 합침 — 응답 `created:false`면 alert로 알림) 회원 소속을 바꾼다. **배포 불필요.**
    - **합치기**: `<select>`(정적 `HOSPITALS` + `hospitals_custom` 합집합에서 `retired`·`'other'` 제외) + "합치기" → `resolveHospitalRequest({…, hospitalId})`. 표기만 다른 기존 기관으로 보낼 때.
    - **거절**: `resolveHospitalRequest` `hospitalId` 없이 → 소속 `기타` 유지.
      전부 `confirm()` 후 실행, 성공 시 커스텀 목록 재조회 + 두 표 새로고침. 위 대기 표의 소속기관 칸에도 요청이 걸린 행은 `🆕 요청: <기관명>` 배지. 기관 이름 표시(`hospitalName`)는 정적 + 커스텀 합집합(`allHospitals`)에서 찾는다 — 페이지 로드·새로고침 때 `hospitals_custom`을 한 번 읽는다(실패하면 정적만).
