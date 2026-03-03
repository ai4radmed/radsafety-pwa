# 테스트 명세: src/store/user.ts

## 대상 구현체

- 경로: src/store/user.ts
- 명세: .spec/src/store/user.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe  | it                                            | 검증 내용                                   |
| --------- | --------------------------------------------- | ------------------------------------------- |
| setUser   | 필수 필드가 올바르게 매핑됨                   | id, login_email, provider, nickname         |
| setUser   | login_email이 있으면 email보다 우선           | login_email 우선                            |
| setUser   | society_name 레거시 필드가 real_name으로 폴백 | society_name → real_name                    |
| setUser   | real_name이 있으면 society_name보다 우선      | real_name 우선                              |
| setUser   | boolean is_admin이 string으로 변환됨          | is_admin: true → 'true'                     |
| setUser   | boolean is_safety_manager가 string으로 변환됨 | is_safety_manager: true → 'true'            |
| setUser   | licenses 배열이 JSON string으로 변환됨        | licenses → users_licenses JSON              |
| setUser   | licenses가 이미 string이면 그대로 저장        | string 그대로                               |
| setUser   | @ksnm.or.kr 이메일은 certification이 ksnm     | getCertification 연동                       |
| clearUser | 모든 필드가 초기값으로 리셋됨                 | id, login_email, nickname, is_admin 등 빈값 |

## Mock/Setup

- beforeEach: clearUser() 호출 (setUser 테스트 전)

## 기존 테스트 참조

- tests/unit/store/user.test.ts_backup
