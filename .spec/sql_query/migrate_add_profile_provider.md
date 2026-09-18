# 명세: sql_query/migrate_add_profile_provider.sql

## 역할 요약

Phase 3(가입 승인 화면, `admin/member-approval.astro`)이 참조하지만 DB에 없던 `profiles.provider` 컬럼을 추가한다. 2026-09-18 PR #52 프리뷰 실측에서 "column profiles.provider does not exist" 로드 실패로 발견.

## Props

없음. Supabase SQL Editor에서 Dr. Ben이 수동 실행한다(다른 `sql_query/migrate_*.sql`과 동일 관례 — 이 저장소 CI/CD는 마이그레이션을 자동 실행하지 않음).

## 사이드 이펙트

- `public.profiles`에 `provider text` 컬럼 추가.
- `profiles_provider_check` CHECK 제약 추가 — `provider IS NULL OR provider IN ('kakao', 'email')`.
- 기존 행에는 영향 없음(전부 `NULL`로 시작).

## 핵심 규칙

1. **왜 세션 값을 못 쓰나** — `auth-handler.ts`의 `baseUser.provider`(`session.user.app_metadata?.provider`)는 로그인한 **본인**에게만 보이는 값이다. 관리자가 *다른 사용자*의 로그인 방식을 조회하려면(`member-approval.astro`의 "로그인 방식" 컬럼) DB에 영속된 값이 필요하다.
2. **백필 불필요** — 이 마이그레이션 시점(2026-09-18)에 `profiles.status='pending'` 행이 0건이라, 화면이 실제로 보여줄 대상 자체가 없다. 기존 active 행이 `provider NULL`로 남아도 무해(화면이 pending만 조회).
3. **값을 채우는 코드** — `src/actions/index.ts`의 `signUpWithUsername`이 `'email'`을 upsert(규칙은 `.spec/src/actions/index.md` 규칙 13). `src/lib/auth-handler.ts`의 `performSelfHealing`이 카카오 신규가입에 `'kakao'`, 그 외에 `'email'`을 upsert(`.spec/src/lib/auth-handler.md` 규칙 4). 이 마이그레이션 자체는 컬럼만 만들고 값은 안 채운다.
4. 멱등 — `ADD COLUMN IF NOT EXISTS`, 제약은 `pg_constraint` 존재 확인 후 추가라 재실행해도 안전.

## 실행 가이드

1. Supabase SQL Editor에서 `sql_query/migrate_add_profile_provider.sql` 전체 실행.
2. 확인(선택):

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'profiles' and column_name = 'provider';

select conname, pg_get_constraintdef(oid) as constraint_def
from pg_constraint
where conname = 'profiles_provider_check';
```

## 성공 기준

- `information_schema.columns`에 `profiles.provider` 존재.
- `admin/member-approval.astro`의 "로드 실패: column profiles.provider does not exist" 에러가 사라짐.
