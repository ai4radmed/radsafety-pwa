# 명세: sql_query/migrate_drop_verification_status.sql

## 역할 요약

2단계 마감 — `profiles.verification_status` 삭제. 2-2(`migrate_drop_legacy_profile_columns.sql`)에서 업로드 게이트 때문에 남겨둔 마지막 인증 잔재를, 2-1(`migrate_add_publish_gate.sql`)이 게이트를 `can_publish`로 교체한 뒤 지운다.

## Props

없음. Dr. Ben 수동(SQL Editor). **순서**: `migrate_add_publish_gate.sql` 실행 → 2-1 코드 배포 → 이 파일.

## 사이드 이펙트

- `profiles.verification_status` 컬럼 삭제. CASCADE 없음 — 의존 정책·함수가 있으면 실패(의도).

## 핵심 규칙

1. 실행 전 점검: `select policyname, tablename from pg_policies where schemaname='public' and (coalesce(qual,'')||coalesce(with_check,'')) like '%verification_status%';` — 결과가 있으면(대시보드에서만 만든 옛 정책) 그 정책을 먼저 DROP.
2. 코드는 이 시점에 `verification_status`를 어디에도 참조하지 않는다(`tests/unit/pages/publish-gate.test.ts`가 자료실·지적사례 소스로 고정, `store/user.ts`에서도 제거).
3. 멱등.

## 성공 기준

- `information_schema.columns`에 `profiles.verification_status` 없음. 자료실·지적사례 등록·열람 정상.

## 실행 기록

- 2026-09-19 운영: 사전 점검에서 대시보드 전용 옛 정책 `Authenticated users can insert archives`(archives INSERT, `verification_status` 참조) 1건 발견 → `DROP POLICY` 후 컬럼 삭제 성공. 이 정책은 저장소 SQL에 없었다 — 대시보드에서 직접 만든 정책이 코드와 어긋나 있던 사례. 새 INSERT 정책 `Active members can submit archives`가 역할을 대체.
