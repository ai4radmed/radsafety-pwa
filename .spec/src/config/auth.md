# 명세: src/config/auth.ts

## 역할 요약

인증·권한 관련 설정 및 유틸리티. 관리자 이메일 목록, 특별 게스트, 역할·자격 정의를 제공하고 `getRole`, `getCertification`, `isAdmin` 함수를 export한다.

## Public API

| 이름                                                             | 타입                                       | 설명                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `ADMIN_EMAILS`                                                   | `string[]`                                 | 환경변수 `PUBLIC_ADMIN_EMAILS`(쉼표 구분) + 기본값 `benkorea.ai@gmail.com` |
| `SPECIAL_GUESTS`                                                 | `string[]`                                 | `['guest@kins.re.kr']`                                                     |
| `ROLES`                                                          | `{ ADMIN: 'admin', USER: 'user' }`         | 역할 상수                                                                  |
| `CERTIFICATIONS`                                                 | `{ KSNM, KSNMT, SPECIAL, NONE }`           | 자격 상수                                                                  |
| `getRole(email)`                                                 | `'admin' \| 'user'`                        | 이메일로 역할 반환                                                         |
| `getCertification(email)`                                        | `'ksnm' \| 'ksnmt' \| 'special' \| 'none'` | 도메인/특별 게스트 기반 자격 반환                                          |
| `isAdmin(email)`                                                 | `boolean`                                  | 대소문자 무시 관리자 여부                                                  |
| `MONTHLY_CHECK_PREFIX`                                           | `'[월간점검]'`                             | 월간 점검 위저드가 보내는 테스트성 발송물의 제목 접두어                    |
| `resolveFeedbackRecipients(title, senderEmail, developerEmails)` | `string[]`                                 | 의견 이메일 수신자 결정 — 테스트성 의견은 개발자 목록으로만 라우팅         |

## 사이드 이펙트

`import.meta.env.PUBLIC_ADMIN_EMAILS` 읽기.

## 핵심 규칙

1. `getCertification`: `@ksnm.or.kr` → KSNM, `@ksnmt.or.kr` → KSNMT, `SPECIAL_GUESTS` 포함 → SPECIAL.
2. `isAdmin`: `toLowerCase()`로 비교.
3. 빈 이메일 시 `getRole` → USER, `getCertification` → NONE, `isAdmin` → false.
4. `resolveFeedbackRecipients` (개발자/관리자 수신 분리 — 2026-07 월간 점검이 관리자 전원에게 발송된 사고 재발 방지):
    - 제목이 `MONTHLY_CHECK_PREFIX` 로 시작 **그리고** 발신자가 관리자 **그리고** `developerEmails` 비어 있지 않음 → `developerEmails` 반환.
    - 그 외 전부 → `ADMIN_EMAILS` 반환 (안전 기본값). 일반 사용자가 같은 접두어를 써도 관리자 전원에게 정상 전달되어 실제 의견이 묻히지 않는다.
    - `developerEmails` 는 호출자(서버)가 env 에서 파싱해 주입 — 이 모듈은 클라이언트에서도 import 되므로 서버 전용 env 를 직접 읽지 않는다.
