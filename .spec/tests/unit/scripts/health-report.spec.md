# 테스트 명세 — `scripts/health-report.mjs`

대상 구현체: `scripts/health-report.mjs`
테스트 구현체: `tests/unit/scripts/health-report.test.ts`

## 역할

`check-production.mjs --summary=<path>` 가 남긴 요약 JSON 을 읽어 **텔레그램 보고 문안**을 만들고 발송한다.
발송(네트워크)은 부작용이므로 **문안 생성(`formatReport`)만 순수 함수로 분리**하고, 단위 테스트는 이 함수만 검증한다.

## 보고 모드 (`HEALTH_REPORT` 저장소 변수)

| 값             | 동작                                        |
| -------------- | ------------------------------------------- |
| 미설정 · `all` | 정상·이상 모두 매일 발송 (기본, 하트비트)   |
| `fail`         | 이상일 때만 발송 (정상은 침묵)              |
| `off`          | 발송하지 않음 (헬스체크·GitHub 알림은 유지) |

## `formatReport(summary, opts)` 검증 항목

1. **정상 요약** → `✅` 로 시작하고, 대상 호스트 · 통과 건수 · 앱 버전을 포함한다.
2. **실패 요약** → `❌` 로 시작하고, 실패 항목 라벨과 detail 을 본문에 나열한다.
3. **경고(warned>0, failed=0)** → 정상(`✅`)으로 보고하되 경고 건수를 함께 표기한다.
4. **시각 표기** — `checkedAt`(ISO/UTC)을 **Asia/Seoul** 로 변환해 표기한다(UTC 원문 노출 금지).
5. **실패 항목 절단** — 실패가 10건을 넘으면 10건까지만 나열하고 잔여 건수를 `…외 N건` 으로 표기한다(텔레그램 메시지 길이 보호).
6. **요약 누락(`summary === null`)** — 점검 스크립트가 요약을 남기기 전에 죽은 경우로 간주하고, `❌` + "점검 실행 자체 실패" 문구를 낸다. **정상으로 오인해선 안 된다.**
7. **실행 로그 링크** — `opts.runUrl` 이 주어지면 본문에 포함한다.

## `shouldSend(summary, mode)` 검증 항목

- `off` → 항상 false.
- `fail` → 정상이면 false, 실패·요약누락이면 true.
- `all`·미설정 → 항상 true.
