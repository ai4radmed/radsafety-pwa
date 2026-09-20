# 테스트 명세: src/lib/bulletins/ingest.ts

## 대상 구현체

- 경로: src/lib/bulletins/ingest.ts
- 명세: .spec/src/lib/bulletins/ingest.md

## 테스트 도구

Vitest. 순수 함수만(supabase-server·logger 모킹). `ingestBulletins` 의 DB 경로는 운영 dry-run(`/api/cron/watch?dry=1` 의 `bulletins[]`)으로 확인.

## 검증 항목

| it                                                             | 검증 내용           |
| -------------------------------------------------------------- | ------------------- |
| bulletinSourceOf — 감시 소스 id 를 bulletins.source 로         | nsic/nssc/null      |
| toIsoDate — 점·하이픈 날짜를 ISO 로, 그 외 null                |                     |
| planIngest nsic — 최초 published 백필, 이후 pending, 기존 제외 |                     |
| planIngest nssc — 관련 신규만 pending, 무관은 제외             |                     |
| suggestParent — ±60일 안 가장 가까운 속보, 없으면 null         | 날짜 없는 후보 무시 |
