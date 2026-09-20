# 명세: src/pages/my-proposals.astro

## 역할 요약

내 제안(회원 전용, `/my-proposals`) — **아이디 모드**로 낸 제안의 목록·상태·답변·철회. 익명 제안은 계정과 연결되지 않아 여기 없다(안내 문구 + 조회 링크).

## 핵심 규칙

1. 조회는 `supabase-browser` `.eq('mode','signed')` — RLS 가 `author_id = auth.uid()` 로 본인만 준다.
2. 철회는 `withdrawProposal`(new/reviewing 만, confirm).
3. 답변 알림의 링크 목적지.

## 관련

`.spec/src/actions/proposals.md` · 사이드바 "내 제안"
