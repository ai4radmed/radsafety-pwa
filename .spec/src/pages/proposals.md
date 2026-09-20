# 명세: src/pages/proposals.astro

## 역할 요약

제도 개선 제안 제출(회원 전용, `/proposals`). 3단계. 익명(기본)/아이디 라디오, 분류, 본문(≥20자), 첨부(이미지·PDF ≤3MB ×3, 파일별 `uploadProposalAttachment` 로 먼저 올리고 결과 경로만 제출), 법적 방어선 문구 2줄, 제출 → 익명이면 접수증 코드 1회 표시(+복사) / 아이디면 "내 제안" 안내.

## 핵심 규칙

1. **익명이 기본값**(`checked`). 익명 제출 전 confirm("코드는 한 번만 표시").
2. 문구는 `PROPOSAL_NOTICES` 상수를 그대로 렌더(계획서 원문).
3. 원본 파일명·미리보기는 화면에도 남기지 않는다(종류·용량만).
4. 회원 전용 — `auth-handler` publicPaths 밖, 사이드바 `data-member-only`, e2e PROTECTED_PAGES.
5. 접수증 코드는 결과 화면 외 어디에도 저장하지 않는다(localStorage ✗).

## 관련

`.spec/src/actions/proposals.md` · `proposal-lookup.md` · `my-proposals.md` · 이용안내 §13 · 테스트 `tests/unit/actions/proposals.test.ts`
