# 명세: sql_query/migrate_add_hospital_request.sql

## 역할 요약

회원기관 등록 요청(`documents/privacy_redesign_plan.md` §2-3, 2026-09-19 개정)을 담는 `profiles.hospital_request` 컬럼을 추가한다. 목록(`src/data/hospitals.ts`)에 없는 기관을 적은 가입자는 `hospital_id='other'`로 그냥 진행하고, 입력한 기관명이 이 컬럼에 남아 관리자 검토 대상이 된다.

## Props

없음. Dr. Ben이 psql(Session pooler) 또는 Supabase SQL Editor에서 수동 실행한다(다른 `sql_query/migrate_*.sql`과 동일 관례 — CI/CD는 마이그레이션을 자동 실행하지 않음).

## 사이드 이펙트

- `public.profiles`에 `hospital_request text` 컬럼 추가(NULL 허용, 기본값 없음).
- 기존 행에는 영향 없음(전부 `NULL`).

## 핵심 규칙

1. **`hospital_request IS NOT NULL` = 검토 대기 중인 요청.** 처리(확정/거절)되면 `NULL`로 비운다. 별도 요청 테이블을 두지 않는다 — 계정당 최대 1건이고 처리되면 사라지는 상태값이라 컬럼 하나로 족하다.
2. **값을 채우는 코드** — `signUpWithUsername`/`claimUsername`(`.spec/src/actions/index.md` 규칙 14): 자동완성에서 목록 항목을 확정하지 않았고 타이핑한 텍스트가 있으면 `hospital_id='other'` + `hospital_request=<텍스트>`. 목록 항목을 확정했으면 `hospital_request=NULL`.
3. **값을 비우는 코드** — `resolveHospitalRequest`(관리자): 확정 시 `hospital_id` 갱신 + `hospital_request=NULL`, 거절 시 `hospital_request=NULL`만(소속 `'other'` 유지).
4. 멱등 — `ADD COLUMN IF NOT EXISTS`.

## 실행 가이드

```bash
/usr/lib/postgresql/17/bin/psql "<Session pooler URI>" -v ON_ERROR_STOP=1 -f sql_query/migrate_add_hospital_request.sql
```

확인:

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'profiles' and column_name = 'hospital_request';
```

## 성공 기준

- `information_schema.columns`에 `profiles.hospital_request` 존재.
- 가입 폼에서 목록에 없는 기관을 적고 가입하면 `admin/member-approval.astro` "기관 등록 요청" 목록에 나타남.
