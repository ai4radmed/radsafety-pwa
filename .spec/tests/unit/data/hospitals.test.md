# 테스트 명세: 회원기관 목록 데이터 (hospitals)

## 대상 구현체

- 경로: src/data/hospitals.ts
- 명세: .spec/src/data/hospitals.md

## 테스트 도구

Vitest (unit)

## 검증 항목

| describe  | it                               | 검증 내용                                                                  |
| --------- | -------------------------------- | -------------------------------------------------------------------------- |
| hospitals | 모든 항목에 id, name이 존재      | 빈 문자열 없음                                                             |
| hospitals | id는 slug 규칙을 따른다          | `^[a-z0-9-]+$`                                                             |
| hospitals | 중복된 id가 없어야 함            | `profiles.hospital_id` 참조 무결성                                         |
| hospitals | 'other'(기타) 항목이 항상 존재   | 명세 규칙 4                                                                |
| hospitals | 중복된 name이 없어야 함          | 공백 제거 후 비교 — 표기만 다른 같은 기관이 두 번 들어가는 것을 막는다     |
| hospitals | 시드 시절부터 있던 id는 유지된다 | 2026-09-16 시드 8개 id 고정 — 목록을 갈아끼워도 기존 회원의 참조가 안 끊김 |

## Mock/Setup

없음(정적 데이터).

## 유지보수 목적

- 목록을 공개 기관회원 명단으로 보정할 때 id 변경·중복 유입 회귀 방지.
