# 명세: src/pages/admin/bulletins.astro

## 역할 요약

사건·사고 검토(관리자). cron 이 모은 원안위 속보·NSIC 사례집(`bulletins`)을 **스레드로 확정하고 게시**한다. K-1(2026-09-20). 자동은 `suggested_parent_id` 까지 — 확정·게시는 사람.

## 화면

- 탭: 검토 대기(pending) / 게시됨(published) / 무시(ignored) + 건수, 새로고침.
- 카드: 출처 배지(원안위/NSIC)·"의료·RI 관련" 배지·사고일·유형·등급·지역·기관 / 제목(원문 링크 새 탭) / 개요+사고원인(접힘, 더 보기) / 폼: 요약(회원에게 보임)·정기검사 준비 포인트·상위 사건 select(루트이고 무시 아닌 사건 전부, 자동 제안이 있으면 미리 선택 + 힌트) / 버튼: 게시+회원 알림(confirm) · 무시 · (게시됨) 저장 · (무시) 되살리기(저장).
- 데이터: `supabase-browser` 로 `bulletins` 전부(관리자 RLS), 처리는 `actions.reviewBulletin`.

## 핵심 규칙

1. `is_admin !== 'true'` 면 `/mypage` 로(다른 관리자 화면과 동일).
2. **게시 = 회원 전체 알림** — confirm 으로 한 번 막는다. 후속(상위 사건 선택)이면 알림 제목이 "후속: …".
3. 상위 사건 select 의 기본값 = `parent_id` ?? `suggested_parent_id` ?? 새 사건. 제안이 있어도 사람이 보고 게시.
4. 무시는 되돌릴 수 있다(되살리기 = `update` 로 저장, status 는 액션이 그대로 둠 → 다시 pending 으로 돌리려면 관리자가 게시/무시 중 택).

## 관련

- 액션 `reviewBulletin`(`.spec/src/actions/index.md`) · 회원 화면 `.spec/src/pages/bulletins.md` · 테스트 `tests/unit/pages/bulletins.test.ts`
