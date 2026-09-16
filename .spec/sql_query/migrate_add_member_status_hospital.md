# 명세: sql_query/migrate_add_member_status_hospital.sql

## 역할 요약

2계층(공개/회원) + 가입 대기승인 + 회원 제재 모델의 Phase 1(스키마). `documents/privacy_redesign_plan.md` 2단계(개정) — KSNM 방안위 교육팀 합의(2026-09-10, [[2026-09-10_KSNM_방안위_교육팀_RadSafety개편방향_의견수렴]] — vault 참고 링크, 코드 저장소 밖)를 승계. `public.profiles`에 `status`·`hospital_id` 컬럼을 추가하는 최소 단위 마이그레이션.

## Props

없음. Supabase SQL Editor에서 실행합니다.

## 사이드 이펙트

- `public.profiles`에 `status text NOT NULL DEFAULT 'active'` 컬럼 추가.
- `profiles_status_check` CHECK 제약 추가 — `status IN ('pending','active','suspended','banned')`.
- `public.profiles`에 `hospital_id text` 컬럼 추가(nullable, DB 외래키 아님 — `src/data/hospitals.ts` id 참조).
- 기존 행에는 영향 없음(전부 `status='active'`로 시작, `hospital_id`는 `NULL`).

## 핵심 규칙

1. **기존 사용자는 잠그지 않는다.** 컬럼 기본값이 `'active'`라 이 마이그레이션만으로는 아무도 접근이 막히지 않는다. `'pending'`은 Phase 2에서 **애플리케이션 코드가 신규 계정 생성 시점에 명시적으로** 지정해야만 발생한다(`signUpWithUsername`, 카카오/이메일 self-healing 등 — 아직 미구현).
2. `hospital_id`는 DB 레벨 참조 무결성을 두지 않는다 — `hospitals.ts`가 코드 파일로 관리되는 정적 목록이기 때문(`documents/privacy_redesign_plan.md` §2-3, `documents/resource_slugs.md`와 동일한 slug 원칙).
3. 멱등 — `ADD COLUMN IF NOT EXISTS`, 제약은 `pg_constraint` 존재 확인 후 추가라 재실행해도 안전하다.
4. 트랜잭션(`BEGIN/COMMIT`)으로 묶는다.

## 실행 가이드

1. Supabase SQL Editor에서 `sql_query/migrate_add_member_status_hospital.sql` 전체 실행
2. 확인(선택):

```sql
select column_name, is_nullable, column_default, data_type
from information_schema.columns
where table_name = 'profiles' and column_name in ('status', 'hospital_id');

select conname, pg_get_constraintdef(oid) as constraint_def
from pg_constraint
where conname = 'profiles_status_check';
```

## 성공 기준

- 기존 사용자 전원의 로그인·기능 접근에 변화가 없다(`status='active'` 기본값 확인).
- 형식에 안 맞는 값(`status`가 4개 값 외)을 직접 UPDATE로 넣으면 `profiles_status_check` 위반(23514)으로 거부된다.

## 관련

- Phase 2(가입 시 소속기관·소속학회 수집, `status='pending'` 명시 생성): 미구현.
- Phase 3(관리자 승인 화면): 미구현.
- Phase 4(콘텐츠 접근 재구성 — 공개/회원 분리): 미구현.
- Phase 5(회원 제재 — `status` 기반 로그인/기능 차단): 미구현.
- 데이터: `src/data/hospitals.ts` (`.spec/src/data/hospitals.md`)
