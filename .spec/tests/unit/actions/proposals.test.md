# 테스트 명세: src/actions/proposals.ts · migrate_add_proposals.sql · 제안 화면 4종

## 대상 구현체

- 경로: src/actions/proposals.ts, src/actions/index.ts, sql_query/migrate_add_proposals.sql, src/pages/{proposals,proposal-lookup,my-proposals}.astro, src/pages/admin/proposals.astro, src/lib/auth-handler.ts, src/components/Sidebar.astro, src/pages/privacy.astro
- 명세: .spec/src/actions/proposals.md 외

## 테스트 도구

Vitest (파일 소스 읽기 기반). "글에 문을 지나간 흔적을 남기지 않는다"는 설계가 코드·SQL·화면에 있는지 검증. 정규식은 prettier 줄바꿈 무관(`\s*`).

## 검증 항목

| describe               | it                                                                           |
| ---------------------- | ---------------------------------------------------------------------------- |
| 문지기는 세션          | index.ts spread, 세션 쿠키 판정, 클라이언트 userId/adminId 입력 없음         |
| 문지기는 세션          | anonymous 는 author_id·created_at NULL + receipt_hash, signed 는 반대        |
| 문지기는 세션          | 쿼터(1인 1일·전체) + 지난 날 정리, submitProposal 로그에 본문·사용자 없음    |
| 문지기는 세션          | 텔레그램은 건수·모드·분류만                                                  |
| 문지기는 세션          | 첨부 — 매직 바이트, 메타 제거, 서비스 롤 업로드, file.name 미사용            |
| 문지기는 세션          | answered 전환 시 signed 작성자에게만 알림                                    |
| SQL — 없는 컬럼이 설계 | ip·user_agent·hospital_id 없음, 익명 신원 NULL CHECK                         |
| SQL — 없는 컬럼이 설계 | 클라이언트 INSERT 정책 없음, SELECT 본인/관리자, 비공개 버킷                 |
| 화면·경로              | 제출: 익명 기본·문구·코드 1회·첨부 액션                                      |
| 화면·경로              | 조회 공개, 제출·내 제안 회원 전용, 사이드바·관리자 링크, 내 제안 signed 필터 |
| 화면·경로              | 관리자: "작성자 기록 없음", 액션 저장·삭제, 서명 URL                         |
| 화면·경로              | 처리방침 문장                                                                |
