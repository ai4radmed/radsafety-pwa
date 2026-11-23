# 명세: sql_query/\_template_new_table.sql

## 역할 요약

새 테이블을 만드는 migration 의 **양식**. 실행하는 파일이 아니라 복사해서 `migrate_add_<이름>.sql` 로 쓰는 본보기다. 본문 전체가 주석이라 SQL Editor 에 통째로 붙여도 아무 일도 일어나지 않는다.

## 배경

Supabase 는 **2026-10-30 부터** `public` 스키마에 새로 만드는 테이블에 Data API 권한을 자동으로 주지 않는다. `GRANT` 를 빼먹으면 테이블은 생기지만 앱(supabase-js)이 `permission denied` 를 받아 그 테이블을 쓰는 화면만 500 이 난다. 배포는 성공으로 보인다. 그 전에 만든 테이블은 옛 자동 권한이 남아 있어 영향이 없다.

## 핵심 규칙

1. **`service_role` GRANT 는 항상 넣는다** — 서버 액션·크론이 서비스 롤로 읽고 쓴다.
2. **`authenticated`·`anon` 은 필요한 만큼만** — RLS 정책이 그 역할을 대상으로 할 때, 필요한 동작(대개 `SELECT`)만. 개인정보가 있는 테이블은 `anon` 에 주지 않는다.
3. 같은 내용을 `sql_query/rebuild_all_tables.sql` 에도 넣는다(AGENTS.md §7).
4. 멱등 — `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` 후 재생성. `GRANT` 는 반복 실행해도 안전하다.

## 검증

`tests/unit/sql_query/grants.test.ts` 가 `sql_query/*.sql` 을 읽어, 2026-10-30 이후 만드는 테이블에 `service_role` GRANT 가 없으면 실패한다(명세: `.spec/tests/unit/sql_query/grants.test.md`).

## 남은 일

`rebuild_all_tables.sql` 로 **빈 프로젝트를 새로 세우면** 옛 테이블들도 "새 테이블"이 되어 권한이 붙지 않는다. 운영 DB 의 현재 권한을 그대로 옮긴 GRANT 묶음을 `rebuild_all_tables.sql` 에 넣어야 재해 복구·새 개발 DB 가 온전해진다. 운영 DB 의 권한 조회 결과가 있어야 정확히 쓸 수 있어 별도 작업으로 둔다.

```sql
-- 운영 DB 현재 권한 조회 (읽기 전용)
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privs
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
 group by 1, 2 order by 1, 2;
```
