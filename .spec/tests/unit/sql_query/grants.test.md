# 테스트 명세: sql_query/\*.sql 의 권한(GRANT) 명시

## 대상 구현체

- 경로: `sql_query/*.sql` (양식: `sql_query/_template_new_table.sql`)
- 명세: `.spec/sql_query/_template_new_table.md`

## 테스트 도구

- Vitest (단위) — DB 에 접속하지 않고 SQL 파일 본문만 읽는다.

## 검증 항목

| describe                     | it                                                      | 검증 내용                                                                                                                              |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| sql_query — 새 테이블의 권한 | SQL 파일을 읽는다                                       | `sql_query/` 에 `.sql` 이 1개 이상                                                                                                     |
| sql_query — 새 테이블의 권한 | 2026-10-30 이후 만드는 테이블은 `service_role` 에 GRANT | 주석을 뺀 본문에서 `CREATE TABLE public.X` 를 찾고, `LEGACY_TABLES` 에 없으면 같은 파일에 `GRANT … ON public.X TO … service_role` 필요 |
| sql_query — 새 테이블의 권한 | 검사기 자체                                             | 누락을 잡는다 · GRANT 가 있으면 통과 · 주석 속 `CREATE TABLE` 은 세지 않는다                                                           |

## 규칙

- `LEGACY_TABLES` = 2026-10-30 전에 운영 DB 에 만들어진 17개 테이블. **새 테이블을 이 목록에 넣어 검사를 피하지 않는다.**
- 검사는 `service_role` 만 강제한다. `authenticated`·`anon` 은 테이블마다 필요가 달라 양식의 안내를 따른다.
