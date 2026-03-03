# 테스트 명세: astro:page-load 리스너 존재 검증

## 대상 구현체

- 경로: src/pages/_.astro, src/components/_.astro, src/layouts/\*.astro
- 명세: codebase_guide.md (View Transitions 대응)

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe         | it                                                      | 검증 내용                      |
| ---------------- | ------------------------------------------------------- | ------------------------------ |
| page-load 리스너 | 동적 데이터 로딩 페이지에 astro:page-load가 있어야 한다 | 정의된 파일 목록에 리스너 존재 |

## 필수 목록 (동적 데이터 로딩 페이지)

- index, feedback, mypage, resources, inspection-prep, findings-recommendations
- settings, notifications, my-feedback
- admin: members, verification-requests, glossary, feedback, send-notification
- components: Sidebar, ChecklistItem, GlossaryModal, Lightbox, LoginGuide
- layouts: DashboardLayout

## 유지보수 목적

- View Transitions 재방문 시 스크립트 미재실행 버그 재발 방지
- 새 페이지 추가 시 목록 갱신 필요

## 기존 테스트 참조

없음 (신규)
