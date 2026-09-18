# 명세: sql_query/migrate_add_username.sql

## 역할 요약

Stage 1-A(username/password 로그인, `documents/privacy_redesign_plan.md` 1단계)를 위해 `public.profiles`에 `username` 컬럼을 추가합니다. 기존 데이터를 보존하는 최소 단위 마이그레이션이며, `sql_query/rebuild_all_tables.sql` 전체 재실행 없이 적용합니다.

## Props

없음. Supabase SQL Editor에서 실행합니다.

## 사이드 이펙트

- `public.profiles`에 `username text` 컬럼 추가(전환 기간 중 `NULL` 허용 — Stage C `migrate_finalize_username.sql`(2026-09-18 작성, `.spec/sql_query/migrate_finalize_username.md`)이 `NOT NULL`로 조인다, Dr. Ben 수동 실행 대기).
- `profiles_username_key` UNIQUE 제약 추가.
- `profiles_username_format_check` CHECK 제약 추가 — `username IS NULL OR username ~ '^[a-z0-9_-]{3,20}$'`.
- 기존 행에는 영향 없음(`username`은 전부 `NULL`로 시작).

## 핵심 규칙

1. 대소문자 구분 없는 로그인은 **저장 시 정규화**로 구현한다 — 서버 액션(`src/actions/index.ts`의 `usernameSchema`)이 항상 소문자로 변환한 뒤 쓰므로, 이 마이그레이션은 citext나 대소문자 무시 인덱스를 쓰지 않는다. DB 레벨 CHECK도 소문자만 허용(`[a-z0-9_-]`)해 이 전제가 깨지면 즉시 실패하게 한다.
2. 멱등 — `ADD COLUMN IF NOT EXISTS`, 제약은 `pg_constraint` 존재 확인 후 추가라 재실행해도 안전하다.
3. 트랜잭션(`BEGIN/COMMIT`)으로 묶는다.

## 실행 가이드

1. Supabase SQL Editor에서 `sql_query/migrate_add_username.sql` 전체 실행
2. 확인(선택):

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'profiles' and column_name = 'username';

select conname, pg_get_constraintdef(oid) as constraint_def
from pg_constraint
where conname in ('profiles_username_key', 'profiles_username_format_check');
```

## 성공 기준

- `signUpWithUsername`/`claimUsername` 액션의 `profiles.username` insert/update가 제약 위반 없이 성공한다.
- 형식에 안 맞는 값(대문자·공백·2자 이하 등)을 직접 UPDATE로 넣으면 `profiles_username_format_check` 위반(23514)으로 거부된다.
