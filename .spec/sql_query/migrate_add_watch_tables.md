# 명세: sql_query/migrate_add_watch_tables.sql

## 역할 요약

외부 게시판 갱신 감시(KINS 연계 트랙 K-3, 2026-09-20)의 상태 테이블 두 개 — `watch_items`(건별 지문)·`watch_sources`(소스별 실행 상태) — 를 만든다. `/api/cron/watch`(`src/pages/api/cron/watch.ts`)가 하루 1회 RASIS 규제해석 SOS·이용자지원간행물 목록 API 를 읽어 여기와 집합 비교한다.

## Props

없음. Dr. Ben이 Supabase SQL Editor에서 수동 실행(다른 `migrate_*.sql`과 동일 관례). **배포 전에 적용** — cron 첫 실행이 baseline 을 쓴다.

## 사이드 이펙트

- 테이블 `public.watch_items(source, external_id) PK, title, category, fingerprint, detail jsonb, first_seen_at, last_seen_at, changed_at, missing_count int default 0, removed_at` 생성.
- 테이블 `public.watch_sources(source PK, last_run_at, last_ok_at, last_count, consecutive_failures int default 0, last_error, baseline_at)` 생성.
- 두 테이블 RLS 활성화, **정책 없음** → 서비스 롤만 읽고 쓴다.

## 핵심 규칙

1. **본문 미저장** — 제목·분류·지문·안내용 소량 메타(`detail`: 관리번호·게시일 등)만. 외부 저작물 재게시가 아니라 "바뀌었다"는 사실만 잡는다.
2. **지문 비교가 핵심** — RASIS 목록은 분류순이라 건수·최신글 비교로는 신규를 못 잡는다. `fingerprint = sha256(변화 감지 필드)` 를 건별로 저장.
3. **삭제는 2회 연속 누락으로 확정**(`missing_count >= 2` → `removed_at`). 행은 지우지 않는다 — 재등장 시 "신규"로 다시 알린다.
4. **개인정보 0** — 외부 공개 게시물 메타뿐. 그래서 처리방침 개정 불필요.
5. 멱등 — `CREATE TABLE IF NOT EXISTS`.

## 실행 가이드

SQL Editor에서 파일 전체 실행. 확인:

```sql
select count(*) from public.watch_items;                 -- 배포 전엔 0
select * from public.watch_sources;                     -- 첫 cron 후 소스별 1행
select relname, relrowsecurity from pg_class where relname like 'watch_%';
```

## 성공 기준

- 테이블 존재 + RLS on. 배포 후 첫 cron(또는 관리자 수동 호출)이 `watch_sources.baseline_at` 을 채우고 `watch_items` 에 SOS 158건·간행물 40건(2026-09-20 기준)이 들어간다. 그 실행에서는 알림이 나가지 않는다.
