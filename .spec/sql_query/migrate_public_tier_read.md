# 명세: sql_query/migrate_public_tier_read.sql

## 역할 요약

2계층(공개/회원) 모델의 **공개 계층 개방**(KSNM 방안위 교육팀 합의 2026-09-10, Dr. Ben 확정 표 2026-09-19). 비가입자(anon)에게 지적권고사례는 **목록 열만**, 자료실은 **게시된 자료 전체 열**(다운로드 경로 포함)을 준다. 함께 "가입 승인 = 게시 권한"(2-1 축소) 백필.

## Props

없음. Dr. Ben 수동(SQL Editor). **코드 배포 전에 실행**(현재 운영 코드는 비로그인을 `/login`으로 보내므로 anon 쿼리가 없어 어느 순서든 안전하지만, 새 코드는 이 권한을 전제).

## 사이드 이펙트

- `findings`: anon의 테이블 권한을 REVOKE 후 **열 단위 GRANT SELECT**(`id, title, finding_type, tags, year, created_at, status, user_id`) — `description`·`violation_clause`·`solution`은 서버가 anon에게 아예 주지 않는다(`permission denied for column`). RLS `Public can list published findings`(TO anon, `status='published'`).
- `archives`: anon SELECT 전체 열 + RLS `Public can view published archives`(TO anon, published). INSERT/UPDATE/DELETE 정책은 authenticated 전용 그대로 → 업로드 불가.
- `increment_view_count`/`increment_download_count` EXECUTE를 anon에도 부여(존재할 때만).
- `profiles.can_publish = true` where `status='active'`(승인 회원 백필). 신규 승인은 `approvePendingMember`가 함께 쓴다.

## 핵심 규칙

1. **열 단위 권한이 진짜 가드다** — 화면 가림(클라이언트 confirm)은 UX일 뿐, 비가입자가 PostgREST를 직접 불러도 본문 열은 못 받는다. 클라이언트는 anon일 때 반드시 허용 열만 `select`한다(`'*'`는 거부됨).
2. 정적(마크다운) 사례 본문은 페이지에 포함돼 있어 클라이언트 가림만 가능 — 공개해도 되는 자료라는 전제(작성 시점부터 공개 콘텐츠).
3. `profiles`는 anon에게 열지 않는다(등록자 표시는 회원에게만). 자료실 목록 조인은 로그인 상태에 따라 분기.
4. 멱등 — REVOKE/GRANT·`DROP POLICY IF EXISTS`·조건부 UPDATE.

## 실행 가이드

파일 전체 실행 → 확인:

```sql
select grantee, column_name from information_schema.column_privileges where table_name='findings' and grantee='anon' order by 2;
select policyname, roles, cmd from pg_policies where tablename in ('findings','archives') order by 1;
```

## 성공 기준

- 로그아웃 상태에서 `/findings-recommendations` 목록 표시, 카드 클릭 시 회원 전용 안내. `/resources` 목록·다운로드 가능, 업로드 버튼 없음.
- e2e `rls-policies.spec.ts`: anon 목록 열 조회 성공, `description` 조회는 42501.
