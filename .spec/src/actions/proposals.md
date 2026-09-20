# 명세: src/actions/proposals.ts

## 역할 요약

3단계 제도 개선 제안 채널의 액션 묶음(`index.ts` `server` 에 spread). **문지기는 RLS 가 아니라 여기** — 세션으로 로그인만 확인하고(익명 모드에선 신원을 본 뒤 버린다) 서비스 롤로 쓴다. 설계 원문 = `documents/privacy_redesign_plan.md` 3단계(2026-09-08 확정, 2026-09-20 구현).

**인증**: 공용 `src/actions/auth.ts`(`requireUser(context, {active:true})`·`requireAdmin`) — 세션 쿠키 기준. 이 파일에서 먼저 도입했고 같은 날 `index.ts` 전 액션으로 확대(`.spec/src/actions/auth.md`).

## Public API

| 액션                       | 입력                                                                | 동작                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploadProposalAttachment` | form `file`(≤3MB)                                                   | 로그인 확인 → 매직 바이트로 종류 판정(jpg/png/webp/pdf) → 메타 제거(sharp 재인코딩 / pdf-lib) → 서비스 롤로 `proposal-attachments/<uuid>/<uuid>.<ext>` 업로드 → `{storage_path,size,kind}`. 원본 파일명 버림                                        |
| `submitProposal`           | `mode`(기본 anonymous)·`category`·`body`(20~4000)·`attachments[≤3]` | ① 세션(active 회원) ② 전체 일일 100건 ③ 1인 1일 3건(`proposal_quota`, 지난 날 행 삭제) ④ insert — anonymous: `author_id`·`created_at` NULL + `receipt_hash` / signed: 기록 ⑤ 텔레그램 "새 제안 1건(모드·분류)" ⑥ anonymous 만 접수증 코드 반환(1회) |
| `lookupProposal`           | `code`                                                              | 로그인 불필요. 정규화 → sha256 → 일치 행의 category·body·status·admin_reply·created_day·answered_at. 실패 사유 미구분(`found:false`)                                                                                                                |
| `withdrawProposal`         | `id`                                                                | 본인 signed 건, new/reviewing 만. 첨부 삭제 + 행 삭제                                                                                                                                                                                               |
| `reviewProposal`           | `id`·`status?`·`adminNote?`·`adminReply?`                           | 관리자. `answered` 로 처음 바뀌면 `answered_at` + signed 작성자에게 알림(`/my-proposals`). 익명은 알림 없음(코드 조회)                                                                                                                              |
| `deleteProposal`           | `id`                                                                | 관리자. 첨부 포함 삭제                                                                                                                                                                                                                              |
| `proposalAttachmentUrl`    | `id`·`storagePath`                                                  | 관리자 또는 본인(signed) — 그 제안의 첨부 목록에 있는 경로만 서명 URL(10분)                                                                                                                                                                         |

## 사이드 이펙트

`proposals`·`proposal_quota` 쓰기(서비스 롤), 비공개 버킷 업로드/삭제/서명 URL, `notifications` insert(signed 답변), 텔레그램 1통(본문 ✗).

## 핵심 규칙

1. **없는 컬럼이 설계** — 익명 행에 신원을 넣을 코드 경로가 없다(`author_id: mode==='signed' ? user.id : null`). DB CHECK 가 이중으로 막는다.
2. **로그에 본문·사용자·요청 메타 없음** — `submitProposal` 의 오류 로그는 코드만. 테스트가 정규식으로 검사.
3. **쿼터 키는 저장하지 않는다** — `proposals` 에 key 컬럼 없음. anonymous 키 = HMAC(user|day, `PROPOSAL_QUOTA_SECRET` 또는 서비스 롤 키 해시 파생).
4. **첨부는 파일 1개씩 ≤3MB** — Vercel 함수 본문 한도(4.5MB). 계획서 10MB 는 이 한도로 축소. 클라이언트 storage 정책 없음(서비스 롤 업로드 → `storage.objects.owner` 없음).
5. hwp·docx 는 받지 않는다(메타 제거 불가). 매직 바이트로 판정 — 확장자 위장 무효.
6. Gemini 등 외부 AI 처리 대상 아님(코드 경로 없음).
7. `lookupProposal` 은 존재 여부만 노출(코드 형식 오류·미존재 동일 응답).

## 알려진 한계 (처리방침 §8)

관리자가 quota key 를 계산하면 "누가 오늘 제안했다"까지는 알 수 있음(어느 글인지 ✗). Vercel·Supabase 로그의 초 단위 시각 대조로 추정 가능. 글 내용이 드러내는 신원은 기술로 막을 수 없음.

## 관련

- `.spec/src/lib/proposals.md` · `.spec/sql_query/migrate_add_proposals.md` · 화면 `.spec/src/pages/{proposals,proposal-lookup,my-proposals}.md`·`admin/proposals.md`
- 테스트: `tests/unit/actions/proposals.test.ts`, `tests/unit/lib/proposals.test.ts`
