# 테스트 명세: src/pages/mypage.astro (개인정보 미표시·옛 인증 UI 제거)

## 대상 구현체

- 경로: src/pages/mypage.astro
- 명세: .spec/src/pages/mypage.md

## 테스트 도구

Vitest (단위, 파일 소스 읽기 기반 회귀 검증)

## 검증 항목

| describe                                       | it                                                                    | 검증 내용                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mypage — 개인정보 미표시·옛 인증 UI 제거 (2-2) | 삭제된 컬럼을 어디에도 참조하지 않는다                                | `real_name`·`society_email`·`login_email`·`nickname`·`department`·`classification`·`affiliation`·면허 필드 문자열 미포함                                                  |
| 〃                                             | 옛 인증요청 UI·모달·명부 대조·안전관리면허 카드가 없다                | `verifyModal`·`toggleVerifyBannerBtn`·`allowed_members`·`verification_requests`·`sendVerificationCode`·`radLicenseSelect`·`managerToggle` 미포함                          |
| 〃                                             | 카드 1은 아이디·가입일·배지만, 카드 2는 소속 정보                     | `userIdentityName`·`userJoinedAt`·`adminBadge` 포함, `userIdentityEmail` 미포함, `<HospitalAutocomplete />`·`societySelect`·`saveAffiliationBtn`·`updateAffiliation` 포함 |
| 〃                                             | 커스텀 기관(c-)은 hospitals_custom 에서 이름을 찾고 등록 요청 중 안내 | `.from('hospitals_custom')`·`hospitalRequestNote`                                                                                                                         |
| 〃                                             | 회원 탈퇴는 남는다                                                    | `deleteAccountBtn`·`deleteOwnAccount(supabase)`                                                                                                                           |

## Mock/Setup

- 파일 소스 읽기 기반 검증. Supabase/브라우저 모킹 불필요.

## 이력

- 2026-09-16: 카드 2 실명·이메일·구분·부서 미표시 검증.
- 2026-09-19: 2-2 — 전면 개정(컬럼 삭제·UI 제거·카드 2 소속 정보).
