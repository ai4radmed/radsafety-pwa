# 명세: src/pages/resources.astro

## 역할 요약

자료실 페이지. archives 테이블 조회, 카테고리 필터, 검색, 정렬, 상세 모달, 관리자/인증자 자료 등록·수정·삭제. PDF 미리보기.

## Props

없음. URL 쿼리 ?slug=로 상세 모달 초기 열기.

## 사이드 이펙트

- archives select/insert/update/delete.
- /api/archives/[id], /api/archives/view/[slug] 호출.

## 핵심 규칙

1. Slug 시스템. documents/resource_slugs.md 참조.
2. 카테고리: 작성지침, 작성예시, 가이드북, 발표자료, 기타.
3. PDF만 미리보기 지원.

## 2-1 업로드 권한 (2026-09-19)

- **등록 버튼 게이트**: `is_admin` 또는 `status==='active' && reject_count<3`. (`verification_status`는 더 이상 보지 않음 — 컬럼 삭제.)
- **제출 상태**: `archives.status`는 DB 트리거가 정한다 — `can_publish`(또는 관리자)면 `published`, 아니면 `pending`. insert 응답의 `status`로 "검토 후 게시" 안내를 분기.
- **파일 버킷**: 신규 제출 시 `can_publish`/관리자면 공개 `resources`(경로 `<random>.<ext>`), 아니면 비공개 `resources-pending`(경로 `<uid>/<random>.<ext>`). `archives.file_bucket`에 기록. 수정 시 기존 버킷 유지(승인이 옮긴다). 삭제는 `file_bucket`을 따른다.
- **열람**: 카드 클릭 시 `status==='published'`이고 slug·파일이 있으면 `/api/archives/view/<slug>`(API는 published만 조회), 아니면 모달. 모달의 다운로드는 pending 버킷이면 `createSignedUrl(60분)`(작성자·관리자만 통과), 공개면 `getPublicUrl`.
- **표시**: 본인 pending/rejected 항목에 `status-badge` + `.not-published`(반투명). 다른 회원에게는 RLS가 애초에 안 보여준다.
- **파일 규칙**(`validateUploadFile`): 20MB 이하, 허용 확장자(pdf·hwp·hwpx·doc·docx·xls·xlsx·ppt·pptx·png·jpg·jpeg·gif·webp·txt·md), 차단(docm·xlsm·pptm·exe·msi·bat·cmd·sh·js·vbs·ps1·jar·scr·com). 파일명은 서버 경로에 쓰지 않고(랜덤) `file_name`에만 원본 보관.
- **확인란**: 신규 제출 시 `#writeConsent`(저작권·개인정보 없음) 필수.
- **관리자 알림**: insert 응답 `status==='pending'`이면 `actions.notifySubmission({kind:'archive', id})`를 fire-and-forget 호출(in-app + 텔레그램, `.spec/src/actions/index.md` 규칙 18).
