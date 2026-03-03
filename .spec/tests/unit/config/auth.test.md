# 테스트 명세: src/config/auth.ts

## 대상 구현체

- 경로: src/config/auth.ts
- 명세: .spec/src/config/auth.md

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe         | it                                                   | 검증 내용                                          |
| ---------------- | ---------------------------------------------------- | -------------------------------------------------- |
| getRole          | 관리자 이메일은 admin 반환                           | getRole('benkorea.ai@gmail.com') === 'admin'       |
| getRole          | 일반 이메일은 user 반환                              | getRole('someone@example.com') === 'user'          |
| getRole          | 빈 문자열은 user 반환                                | getRole('') === 'user'                             |
| isAdmin          | 관리자 이메일은 true                                 | isAdmin('benkorea.ai@gmail.com') === true          |
| isAdmin          | 대소문자 무시하여 판별                               | isAdmin('BENKOREA.AI@GMAIL.COM') === true          |
| isAdmin          | 일반 이메일은 false                                  | isAdmin('user@example.com') === false              |
| isAdmin          | 빈 문자열은 false                                    | isAdmin('') === false                              |
| getCertification | @ksnm.or.kr 도메인은 ksnm 반환                       | getCertification('user@ksnm.or.kr') === 'ksnm'     |
| getCertification | @ksnmt.or.kr 도메인은 ksnmt 반환                     | getCertification('user@ksnmt.or.kr') === 'ksnmt'   |
| getCertification | SPECIAL_GUESTS 이메일은 special 반환                 | getCertification('guest@kins.re.kr') === 'special' |
| getCertification | 기타 이메일은 none 반환                              | getCertification('user@example.com') === 'none'    |
| getCertification | 빈 문자열은 none 반환                                | getCertification('') === 'none'                    |
| ADMIN_EMAILS     | 기본 관리자 이메일이 포함되어 있어야 함              | ADMIN_EMAILS.includes('benkorea.ai@gmail.com')     |
| ROLES            | ADMIN, USER 상수가 정의되어 있어야 함                | ROLES.ADMIN === 'admin', ROLES.USER === 'user'     |
| CERTIFICATIONS   | KSNM, KSNMT, SPECIAL, NONE 상수가 정의되어 있어야 함 | 4개 상수 값 검증                                   |

## Mock/Setup

- import.meta.env 모킹 불필요 (ADMIN_EMAILS는 모듈 로드 시 결정됨)
- beforeEach/afterEach 없음

## 기존 테스트 참조

- tests/unit/config/auth.test.ts_backup
