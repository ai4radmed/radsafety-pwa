# 명세: src/pages/proposal-lookup.astro

## 역할 요약

익명 제안 조회(`/proposal-lookup`, **공개**). 접수증 코드 입력 → `lookupProposal` → 분류·접수일·상태·본문·관리자 답변.

## 핵심 규칙

1. **로그인 불필요** — 코드 소지 = 본인. 로그인을 요구하면 조회 시각과 계정이 다시 묶여 익명성이 약해진다. `auth-handler` publicPaths + e2e PUBLIC_PAGES.
2. 실패 사유 미구분("해당 코드의 제안이 없습니다") — 코드 존재 여부 탐색을 돕지 않는다.
3. 입력은 대소문자·하이픈 무관(서버 정규화).
4. 사이드바 공개 메뉴 "제안 조회"(2026-09-20 보완 — 로그아웃 상태에서 찾기 쉽게).

## 관련

`.spec/src/actions/proposals.md` · `proposals.md`
