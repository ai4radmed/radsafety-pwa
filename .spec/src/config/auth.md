# 명세: src/config/auth.ts

## 역할 요약

인증·권한 관련 설정 및 유틸리티. 관리자 이메일 목록, 특별 게스트, 역할·자격 정의를 제공하고 `getRole`, `getCertification`, `isAdmin` 함수를 export한다.

## Public API

| 이름                      | 타입                                       | 설명                                                                       |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `ADMIN_EMAILS`            | `string[]`                                 | 환경변수 `PUBLIC_ADMIN_EMAILS`(쉼표 구분) + 기본값 `benkorea.ai@gmail.com` |
| `SPECIAL_GUESTS`          | `string[]`                                 | `['guest@kins.re.kr']`                                                     |
| `ROLES`                   | `{ ADMIN: 'admin', USER: 'user' }`         | 역할 상수                                                                  |
| `CERTIFICATIONS`          | `{ KSNM, KSNMT, SPECIAL, NONE }`           | 자격 상수                                                                  |
| `getRole(email)`          | `'admin' \| 'user'`                        | 이메일로 역할 반환                                                         |
| `getCertification(email)` | `'ksnm' \| 'ksnmt' \| 'special' \| 'none'` | 도메인/특별 게스트 기반 자격 반환                                          |
| `isAdmin(email)`          | `boolean`                                  | 대소문자 무시 관리자 여부                                                  |

## 사이드 이펙트

`import.meta.env.PUBLIC_ADMIN_EMAILS` 읽기.

## 핵심 규칙

1. `getCertification`: `@ksnm.or.kr` → KSNM, `@ksnmt.or.kr` → KSNMT, `SPECIAL_GUESTS` 포함 → SPECIAL.
2. `isAdmin`: `toLowerCase()`로 비교.
3. 빈 이메일 시 `getRole` → USER, `getCertification` → NONE, `isAdmin` → false.
