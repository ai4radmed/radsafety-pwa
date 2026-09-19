# 테스트 명세: src/store/user.ts

## 대상 구현체

- 경로: src/store/user.ts
- 명세: .spec/src/store/user.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe  | it                                                      | 검증 내용                                                     |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| setUser   | 필수 필드가 올바르게 매핑됨                             | id, provider, username, status                                |
| setUser   | 이메일·닉네임·실명은 스토어에 저장되지 않는다 (2-2)     | 입력에 섞여 와도 `nickname`/`real_name`/`login_email` 키 없음 |
| setUser   | username 미설정 시 빈 문자열                            | username: ''                                                  |
| setUser   | 소속(기관·학회·기관 등록 요청) 매핑, null → ''          | society/hospital_id/hospital_request                          |
| setUser   | 업로드 권한(can_publish·reject_count) 매핑·기본값 (2-1) | true→'true', 2→'2', 미지정→'false'/'0'                        |
| setUser   | boolean is_admin이 string으로 변환됨                    | is_admin: true → 'true'                                       |
| setUser   | licenses 배열이 JSON string으로 변환됨                  | licenses → users_licenses JSON                                |
| setUser   | licenses가 이미 string이면 그대로 저장                  | string 그대로                                                 |
| setUser   | @ksnm.or.kr 이메일은 certification이 ksnm               | getCertification 연동                                         |
| clearUser | 모든 필드가 초기값으로 리셋됨                           | id, username, is_admin, provider, 소속 빈값                   |

## Mock/Setup

- beforeEach: clearUser() 호출 (setUser 테스트 전)

## 이력

- 2026-09-19: 2-2 — login_email/nickname/real_name/is_safety_manager 케이스 삭제, 소속·개인정보 미저장 케이스 추가.
