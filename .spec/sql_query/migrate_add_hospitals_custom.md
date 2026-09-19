# 명세: sql_query/migrate_add_hospitals_custom.sql

## 역할 요약

관리자가 가입승인 화면에서 **배포 없이** 바로 등록하는 회원기관 테이블 `hospitals_custom`을 만든다(`documents/privacy_redesign_plan.md` §2-3, 2026-09-19 개정 2). 정적 목록 `src/data/hospitals.ts`와 합쳐서 하나의 기관 목록처럼 쓰인다(`src/lib/hospitals.ts`).

## Props

없음. Dr. Ben이 Supabase SQL Editor에서 수동 실행(다른 `migrate_*.sql`과 동일 관례). **배포 전에 적용** — 자동완성(anon 읽기)·가입 액션(id 검증)이 이 테이블을 읽는다.

## 사이드 이펙트

- 테이블 `public.hospitals_custom(id text PK, name text, created_by uuid→profiles ON DELETE SET NULL, created_at, retired boolean default false)` 생성.
- RLS 활성화 + SELECT 정책 `USING (true)` + `anon`/`authenticated`에 SELECT grant. 쓰기 정책 없음(서비스 롤 전용).

## 핵심 규칙

1. **id는 이름에서 결정적으로 도출** — `'c-' + sha256(공백 제거·소문자화한 name)[:10]`(`customHospitalId`). 같은 이름 → 같은 id → 중복 등록이 upsert로 자연 흡수. slug 규칙(영문 소문자·숫자·하이픈) 만족. `hospitals.ts`로 승격할 때 id를 그대로 가져가면 회원 참조 불변.
2. **읽기 공개** — 로그인 전 가입 폼의 자동완성이 읽어야 하므로 anon 포함 전원 SELECT. 개인정보 없음(기관명뿐).
3. **쓰기는 서버 액션만**(`registerHospitalFromRequest`, 서비스 롤). 클라이언트 정책 없음.
4. `retired`는 폐업·통합 시 자동완성에서 빼되 행은 남기기 위한 플래그(정적 목록과 같은 의미).
5. 멱등 — `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` 후 재생성.

## 실행 가이드

SQL Editor에서 파일 전체 실행. 확인:

```sql
select id, name, created_at from public.hospitals_custom order by created_at;
select policyname, cmd from pg_policies where tablename = 'hospitals_custom';
```

## 성공 기준

- 테이블·정책 존재. 로그아웃 상태에서 `radsafety.kr/login` 가입 탭 자동완성에 관리자가 등록한 기관이 나타남.
