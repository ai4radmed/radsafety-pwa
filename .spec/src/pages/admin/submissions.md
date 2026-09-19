# 명세: src/pages/admin/submissions.astro

## 역할 요약

**제출 검토**(관리자). 2단계 2-1(`documents/privacy_redesign_plan.md` §2-1, 2026-09-19). 직접 게시 권한(`can_publish`)이 없는 회원의 첫 제출(`status='pending'`) 자료실 항목·지적사례를 한 표에서 승인/반려한다. 게시 권한 회수는 `admin/members.astro`.

## Props

없음.

## 사이드 이펙트

- `archives`·`findings` select(`status='pending'`, 작성자 `profiles(username, reject_count)` 조인). 비공개 버킷 파일은 `createSignedUrl`(10분)로 열람.
- `actions.reviewSubmission({ adminId, kind, id, decision, reason? })` 호출.

## 핵심 규칙

1. **접근 제어**: `is_admin`만(비관리자 alert 후 `/mypage`). `prerender = false`.
2. **목록**: 두 표(`archives`·`findings`)의 pending을 합쳐 제출일 오름차순. 컬럼 — 종류(자료실/지적사례)·제목(+자료실 파일이면 "파일 보기")·제출자(`@username` + 반려 누적 배지)·제출일·처리.
3. **승인**: `confirm()` → `reviewSubmission(decision:'approve')`. 서버가 게시·파일 이동·`can_publish=true`·알림까지 처리. 성공 시 목록 새로고침(행이 사라짐).
4. **반려**: `prompt()`로 사유(선택) → `reviewSubmission(decision:'reject', reason)`. 서버가 `rejected`·`reject_count+1`·알림.
5. 사용자 입력은 `escapeHtml`. 파일 보기는 `file_bucket`에 따라 서명 URL(pending) / 공개 URL.
6. 첫 제출 시 관리자 알림(계획서 규칙 6): 제출자 클라이언트가 `notifySubmission`을 호출 → 관리자 전원 in-app 알림 + 텔레그램 1통(`src/lib/telegram.ts`, Dr. Ben 개인 DM — 관리자가 늘면 그룹으로 분리). 2026-09-19 구현.

## 이력

- 2026-09-19: 신설.
