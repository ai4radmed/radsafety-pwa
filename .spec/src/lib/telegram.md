# 명세: src/lib/telegram.ts

## 역할 요약

서버 전용 텔레그램 발송 유틸. 2-1 규칙 6(첫 제출 시 관리자 텔레그램 1통)을 위해 2026-09-19 신설. GitHub Actions `scripts/health-report.mjs`와 **같은 봇(`@radsafety_kr_bot`)·같은 방(Dr. Ben 개인 DM)** — 자격은 Vercel env `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`(3 스코프 모두 존재, `credentials-map.md` §1-b).

## Public API

| 이름                        | 설명                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `isTelegramConfigured()`    | 토큰·chat_id 둘 다 있는가                                                                        |
| `sendTelegramMessage(text)` | `sendMessage` POST. 자격 없으면 `false`(생략), 성공 `true`, HTTP 오류는 **throw**(호출자가 삼킴) |

## 핵심 규칙

1. **`PUBLIC_` 접두 금지** — Astro는 `PUBLIC_*`를 클라이언트 번들에 인라인한다. 이 모듈은 서버(액션)에서만 import.
2. HTTP 오류를 조용히 넘기지 않는다(health-report와 같은 원칙) — 대신 호출자(`notifySubmission`)가 catch 해 처리 결과를 바꾸지 않는다.
3. 10초 타임아웃, 링크 미리보기 끔.
4. **env 는 `import.meta.env` → `process.env` 순으로 읽는다**(2026-09-20). Vercel Cron 실행에서 `import.meta.env.TELEGRAM_*` 가 비어 "자격 미설정" 으로 발송이 생략된 실측 — `health.ts` 의 `HEALTH_CHECK_TOKEN` 과 같은 함정. `push.ts` 의 VAPID 도 같은 폴백.
5. 지금은 관리자 = 개발자(Dr. Ben) 한 명이라 개인 DM으로 간다. 실제 관리자가 늘면 별도 env(예: `SUBMISSION_TELEGRAM_CHAT_ID`)로 관리자 그룹을 가리키게 분리한다 — 헬스체크 DM과 콘텐츠 알림을 섞지 않는 운영 원칙.

## 관련

- 사용처: `src/actions/index.ts` `notifySubmission`
- 테스트: `tests/unit/lib/telegram.test.ts`
