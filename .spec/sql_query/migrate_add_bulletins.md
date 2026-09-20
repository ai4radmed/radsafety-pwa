# 명세: sql_query/migrate_add_bulletins.sql

## 역할 요약

사건·사고 전파(K-1, 2026-09-20)의 저장 테이블 `bulletins`. 원안위 보도자료(속보)와 NSIC 방사선사고 사례집(확정본)을 **사건 스레드**(루트 + 후속)로 담는다. `/api/cron/watch` 가 수집·백필하고, 관리자(`admin/bulletins.astro`)가 스레드 확정·게시하며, 회원(`bulletins.astro`)이 published 만 본다.

## Props

없음. Dr. Ben 이 Supabase SQL Editor 에서 수동 실행. **배포 전에 적용** — cron 첫 실행이 NSIC 103건을 백필한다.

## 사이드 이펙트

- 테이블 `public.bulletins` (컬럼은 SQL 주석 참조; `UNIQUE(source, external_id)`, `parent_id`/`suggested_parent_id` 자기참조 FK ON DELETE SET NULL).
- 인덱스 `(status, occurred_at DESC)`, `(parent_id)`.
- RLS: SELECT `authenticated` — `status='published' OR is_current_user_admin()`. 쓰기 정책 없음(서비스 롤 전용). anon 없음.

## 핵심 규칙

1. **사건 단위** — 같은 사고의 속보·확정본을 `parent_id` 로 묶는다(Dr. Ben 2026-09-20 중복 지적). 자동은 `suggested_parent_id` 까지, `parent_id` 확정은 관리자.
2. **본문 미재게시** — `source_url` 로 링크. NSIC 개요·원인만 요약으로 저장(정보공개 데이터), 실명·상세주소 컬럼 없음.
3. `status`: `pending`(관리자 검토 대기) → `published`(회원 공개 + 알림) / `ignored`. NSIC **백필(최초)** 은 published 로 들어간다 — 이미 정제된 공개 사례집이라 검토 없이 사례집이 첫날부터 채워지고, 이후 신규만 pending.
4. `relevant` 는 어댑터 판정(의료·RI). 회원 화면 기본 필터.
5. 멱등.

## 실행 가이드

```sql
select source, status, count(*) from public.bulletins group by 1,2 order by 1,2;   -- 첫 cron 후 nsic/published 103
select policyname from pg_policies where tablename = 'bulletins';
```

## 성공 기준

테이블·정책 존재. 배포 후 첫 cron(또는 Run)에서 `bulletins` 에 NSIC 103건(published, relevant 19건 안팎) 이 들어가고 회원 `/bulletins` 에 보인다.
