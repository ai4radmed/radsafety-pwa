# 명세: src/data/hospitals.ts

## 역할 요약

대한핵의학회 회원기관 목록. `documents/privacy_redesign_plan.md` §2-3 — DB 테이블이 아니라 앱 설정 파일로 관리한다. Phase 2(가입 시 소속기관 선택)에서 소비할 예정(미구현).

## Public API

| 이름        | 타입         | 설명                              |
| ----------- | ------------ | --------------------------------- |
| `Hospital`  | `interface`  | `{ id, name, region?, retired? }` |
| `HOSPITALS` | `Hospital[]` | 회원기관 목록                     |

## 핵심 규칙

1. `id`는 slug 규칙(`documents/resource_slugs.md`와 동일) — 영문 소문자·숫자·하이픈, 한 번 정하면 변경 금지. `profiles.hospital_id`가 이 값을 저장.
2. 병원 개명·합병 시 `id`는 유지하고 `name`만 수정.
3. 폐업·통합 시 항목을 삭제하지 않고 `retired: true`로 표시 — 기존 회원의 `hospital_id` 참조가 끊기지 않도록.
4. `{ id: 'other', name: '기타' }` 항목은 항상 존재 — 회원기관이 아닌 곳(비회원 병원·연구기관 등) 소속자용. "미가입 병원 추정" 집계·기관 추가 요청 대상에서 제외.
5. **⚠️ 미완성**: 대한핵의학회 정회원기관 180개 전수 목록이 아니다. vault에 실명으로 기록된 방안위원 소속기관 일부만 시드로 들어 있음. 학회 홈페이지 공개 명단(전수)으로 교체 필요 — 개인 명부(0단계 유출 파일)는 출처로 쓰지 않는다.

## 관련

- 마이그레이션: `sql_query/migrate_add_member_status_hospital.sql` (`profiles.hospital_id` 컬럼)
- 참조 패턴: `src/data/resources.ts`(같은 자리의 정적 데이터 파일)
