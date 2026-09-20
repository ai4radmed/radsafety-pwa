# 명세: src/pages/admin/proposals.astro

## 역할 요약

제안 검토(관리자, `/admin/proposals`). 탭 진행 중(new+reviewing)/답변 완료/종결, 통계(전체·익명·아이디 — KINS 보고용 집계), 카드(모드 배지·분류·시각 또는 날짜·작성자 또는 "작성자 기록 없음"·본문·첨부 버튼(서명 URL)·상태 select·관리자 메모·답변·저장·삭제).

## 핵심 규칙

1. `is_admin !== 'true'` 면 `/mypage`.
2. 익명 행은 작성자 열이 비어 있다 — 관리자는 누구에게 답하는지 모른 채 답한다.
3. 쓰기는 전부 액션(`reviewProposal`·`deleteProposal`) — 클라이언트 update 정책 없음.
4. 공개할 가치가 있는 제안은 **특정 정보를 지운 뒤 지적권고사례로 옮겨 적는 수동 단계**(자동 이관 ✗). 본문은 외부 AI 에 넘기지 않는다(화면 문구로 상기).
5. 답변 완료로 바꾸는데 답변이 비어 있으면 confirm.

## 관련

`.spec/src/actions/proposals.md` · 회원 화면 `proposals.md`·`my-proposals.md`·`proposal-lookup.md`
