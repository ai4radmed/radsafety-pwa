# 테스트 명세: src/pages/bulletins.astro · src/pages/admin/bulletins.astro · reviewBulletin · cron 배선

## 대상 구현체

- 경로: src/pages/bulletins.astro, src/pages/admin/bulletins.astro, src/actions/index.ts(reviewBulletin), src/pages/api/cron/watch.ts, src/components/Sidebar.astro
- 명세: .spec/src/pages/bulletins.md, .spec/src/pages/admin/bulletins.md, .spec/src/actions/index.md, .spec/src/pages/api/cron/watch.md

## 테스트 도구

Vitest (파일 소스 읽기 기반 — api-health.test.ts 패턴).

## 검증 항목

| describe                | it                                                                   | 검증 내용                                                              |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 회원 /bulletins         | published 만 조회, parent_id 스레드, 기본 필터 relevant              |                                                                        |
| 회원 /bulletins         | 원문은 링크, 준비 포인트 강조                                        | `source_url`·`noopener`·문구                                           |
| 회원 /bulletins         | 회원 전용 — publicPaths 에 없고 사이드바 data-member-only            | 관리자 링크도 존재                                                     |
| 관리자 /admin/bulletins | 관리자 게이트 + reviewBulletin 으로 게시/무시/저장                   |                                                                        |
| 관리자 /admin/bulletins | 스레드 확정은 사람 — 자동 제안은 미리 골라만 둔다                    | `suggested_parent_id`, 새 사건 옵션, 게시 confirm                      |
| reviewBulletin          | assertAdmin, active 회원 알림, 후속 제목, 자기참조·재게시 거부       |                                                                        |
| cron 배선               | 소스별 실행 뒤 ingestBulletins, dry 면 저장 ✗                        | 응답에 `bulletins`                                                     |
| K-1 후속                | 체크리스트 앵커·해시 열기·스크롤                                     | ChecklistItem `id=checklist-<slug>`, `location.hash`, `scrollIntoView` |
| K-1 후속                | 관리자 카탈로그 선택 → checklistRefs                                 | `getCollection`, `#checklistCatalog`, `data-cl`, 액션 zod·patch        |
| K-1 후속                | 회원 화면 refs → /inspection-prep#checklist-<slug>, 미지 slug 건너뜀 |                                                                        |
| K-1 후속                | 홈 배너 — 회원 전용·관련 루트 1건·실패 시 숨김                       |                                                                        |
| K-1 후속                | PWA bulletins-data NetworkFirst 7일                                  | `astro.config.mjs` runtimeCaching                                      |
