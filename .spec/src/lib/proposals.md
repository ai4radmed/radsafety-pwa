# 명세: src/lib/proposals.ts

## 역할 요약

3단계 제안 채널의 순수 헬퍼 + 첨부 메타 제거. DB 접근 없음. 액션(`src/actions/proposals.ts`)과 화면(문구 상수)이 공유.

## Public API

| 이름                                                  | 설명                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---- |
| 상수                                                  | `PROPOSAL_CATEGORIES`(안전관리·피폭·규제·기타) · `PROPOSAL_STATUSES`(new·reviewing·answered·closed) · `DAILY_QUOTA_PER_USER`=3 · `DAILY_QUOTA_GLOBAL`=100 · `BODY_MIN`=20 · `BODY_MAX`=4000 · `ATTACHMENT_MAX_BYTES`=3MB · `ATTACHMENT_MAX_COUNT`=3 · `ATTACHMENT_BUCKET` · `PROPOSAL_NOTICES`(법적 방어선 문구 4종) |
| `makeReceiptCode()`                                   | `RS-XXXX-XXXX`, 알파벳 32자(0/O/1/I 제외), `randomBytes` — 32^8 ≈ 1.1e12                                                                                                                                                                                                                                             |
| `normalizeReceiptCode(input)`                         | 대소문자·공백·하이픈·`RS` 접두 무관, 8자 아니면 `''`                                                                                                                                                                                                                                                                 |
| `hashReceiptCode(code)`                               | sha256 hex — DB 에는 해시만                                                                                                                                                                                                                                                                                          |
| `todayKst(now?)`                                      | KST 달력 날짜 — `created_day` 와 쿼터 `day` 가 같은 달력                                                                                                                                                                                                                                                             |
| `quotaKey(mode, userId, day, secret)`                 | anonymous `a:` + HMAC-SHA256(user                                                                                                                                                                                                                                                                                    | day) / signed `s:user  | day` |
| `quotaSecret(env)`                                    | `PROPOSAL_QUOTA_SECRET` 우선, 없으면 `sha256('proposal-quota:' + SUPABASE_SERVICE_ROLE_KEY)` 파생, 둘 다 없으면 throw                                                                                                                                                                                                |
| `sniffKind(bytes)`                                    | 매직 바이트 → `{kind:'image'                                                                                                                                                                                                                                                                                         | 'pdf', ext}` 또는 null |
| `isValidAttachmentPath(p)` / `newAttachmentPath(ext)` | `<uuid>/<uuid>.<ext>` 형식 검증·생성                                                                                                                                                                                                                                                                                 |
| `stripImageMetadata(bytes, ext)`                      | sharp `.rotate()`(EXIF 방향 반영) → 긴 변 2000px → 재인코딩. `withMetadata` 미호출 = EXIF·GPS·ICC 제거                                                                                                                                                                                                               |
| `stripPdfMetadata(bytes)`                             | pdf-lib: 제목·작성자·주제·키워드·Producer·Creator 비움, 생성/수정일 epoch. 본문 불변                                                                                                                                                                                                                                 |

## 핵심 규칙

1. 순수 함수는 `node:crypto` 만 의존 — 테스트가 결정적.
2. `sharp`·`pdf-lib` 는 동적 import(서버 번들에서만 로드).
3. 문구 상수는 화면과 테스트가 같은 원문을 참조(계획서 §제출 화면 문구).

## 관련

- `.spec/src/actions/proposals.md` · 테스트 `tests/unit/lib/proposals.test.ts`
