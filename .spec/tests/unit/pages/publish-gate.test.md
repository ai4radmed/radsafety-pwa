# 테스트 명세: 2-1 업로드 권한 게이트 (소스 계약)

## 대상 구현체

- 경로: src/pages/resources.astro, src/pages/findings-recommendations.astro, src/pages/admin/submissions.astro, src/pages/admin/members.astro, src/pages/mypage.astro, src/components/Sidebar.astro
- 명세: .spec/src/pages/resources.md, findings-recommendations.md, admin/submissions.md, admin/members.md, mypage.md

## 테스트 도구

Vitest (파일 소스 읽기 기반 회귀 검증)

## 검증 항목

| it                                                                               | 검증 내용                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 자료실·지적사례는 verification_status 를 보지 않고 status/reject_count 로 게이트 | `verification_status` 미포함, `currentUser.status === 'active'`·`reject_count` 포함                                      |
| 자료실: pending 파일은 비공개 버킷 `<uid>/`, 서명 URL, 버킷 따라 삭제            | `'resources-pending'`, `${currentUser.id}/${baseName}`, `createSignedUrl(fileUrl, 60 * 60)`, `file_bucket: targetBucket` |
| 자료실: 파일 규칙 + 저작권·개인정보 확인란                                       | `20 * 1024 * 1024`, 차단 확장자 목록, `id="writeConsent"`, `validateUploadFile(file)`                                    |
| 자료실·지적사례: pending/rejected 배지·제출 안내·게시물만 API 직접 열기          | `status-badge pending`, `관리자 검토 후 게시`, `item?.status === 'published'`                                            |
| 제출 검토 페이지                                                                 | `eq('status', 'pending')`, `actions.reviewSubmission`, 관리자 가드, `prerender = false`, 사이드바 링크                   |
| 회원 목록: 게시 권한 표시 + 토글                                                 | `can_publish, reject_count` select, `actions.setPublishPermission`                                                       |
| 마이페이지 카드 2: 업로드 권한 행                                                | `id="userPublishStatus"`                                                                                                 |
| 회원 목록 — 권한 버튼 노출 조건                                                  | 관리자·banned·pending 행에는 부여/회수 버튼 없음                                                                         | `inactive` 판정·조건식(2026-09-20) |
