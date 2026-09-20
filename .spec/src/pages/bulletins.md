# 명세: src/pages/bulletins.astro

## 역할 요약

사건·사고(회원 전용, `/bulletins`). `bulletins` 의 published 만 **스레드**(루트 + 후속)로 보여 준다. K-1(2026-09-20). 기본 필터 "의료·RI 관련"(스레드 중 하나라도 relevant), 전체 토글.

## 화면

- 카드 = 스레드 루트: 출처 배지·사고일·유형·등급·지역·기관 / 제목(원문 링크 새 탭) / 개요+사고원인(접힘) / **정기검사 준비 포인트**(강조 박스) / 후속 목록(점선 들여쓰기, "후속 ·" 접두, 같은 구성).
- 데이터: `supabase-browser` `.eq('status','published')` (RLS 도 published 만 준다), 최신 사고일순 500건.

## 핵심 규칙

1. **회원 전용** — `auth-handler` publicPaths 에 없음(비회원은 `/login?from=/bulletins`). 사이드바 `data-member-only`.
2. **본문 전문 재게시 ✗** — 원문 링크(`source_url`) + NSIC 개요·원인 요약 + 관리자 요약/준비 포인트만.
3. 부모가 published 가 아닌 후속(부모가 pending 상태 등)은 루트처럼 표시해 숨기지 않는다.
4. 출처 표기(원안위·NSIC 공공누리) 문구를 상단에 둔다.

5. "더 보기" 버튼은 요약이 실제로 잘렸을 때(`scrollHeight > clientHeight`)만 보인다 — 짧은 요약에 누를 게 없는 버튼이 붙던 결함 수정(Dr. Ben 2026-09-20).

6. **관련 체크리스트(후속 2026-09-20)** — `checklist_refs` 를 카탈로그(slug→제목)로 바꿔 `/inspection-prep#checklist-<slug>` 링크로 보여 준다(항목이 펼쳐진 채 스크롤). 카탈로그에 없는 slug 는 조용히 건너뛴다.
7. **오프라인** — Supabase REST `bulletins` 응답을 SW 가 NetworkFirst(`bulletins-data`, 7일)로 캐시해 마지막으로 본 사례집이 오프라인에서도 열린다(`astro.config.mjs` runtimeCaching).

## 관련

- 이용안내 §12 · 사이드바 "사건·사고" · 관리자 `.spec/src/pages/admin/bulletins.md` · 테스트 `tests/unit/pages/bulletins.test.ts`
