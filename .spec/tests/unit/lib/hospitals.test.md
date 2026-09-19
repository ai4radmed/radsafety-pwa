# 테스트 명세: 회원기관 조회 모듈 (lib/hospitals)

## 대상 구현체

- 경로: src/lib/hospitals.ts
- 명세: .spec/src/lib/hospitals.md

## 테스트 도구

Vitest (unit). `supabase-server`를 모의해 `hospitals_custom` select만 흉내낸다.

## 검증 항목

| describe      | it                                                     | 검증 내용                                                    |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| lib/hospitals | customHospitalId — 결정적·공백/대소문자 무관·slug 규칙 | 같은 이름 → 같은 id, `^c-[a-f0-9]{10}$`, 다른 이름은 다른 id |
| lib/hospitals | normalizeHospitalName                                  | 공백 제거·소문자화                                           |
| lib/hospitals | findStaticHospitalByName                               | 표기만 다른 정적 기관 매칭, `기타`·미존재는 undefined        |
| lib/hospitals | isKnownHospitalId — 정적 id                            | DB 조회 없이 true                                            |
| lib/hospitals | isKnownHospitalId — c- 접두 아님                       | DB 조회 없이 false(UI 우회 값이 DB까지 가지 않음)            |
| lib/hospitals | isKnownHospitalId — c- 접두                            | `hospitals_custom` 존재 여부로 판정                          |
| lib/hospitals | getHospitalName                                        | 정적 → 커스텀 → id 폴백                                      |

## 유지보수 목적

- id 도출 규칙이 바뀌면 기존 `profiles.hospital_id`가 끊긴다 — 결정성 테스트가 그 회귀를 막는다.
