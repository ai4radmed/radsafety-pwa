# 명세: src/pages/api/cron/watch.ts (+ vercel.json crons)

## 역할 요약

GET `/api/cron/watch`. Vercel Cron 이 **하루 1회** 호출해 `WATCH_SOURCES`(RASIS 규제해석 SOS·이용자지원간행물)를 순서대로 감시하고 결과를 회원·관리자에게 전달한다. KINS 연계 트랙 K-3(2026-09-20). 로직은 `src/lib/watch/*` 에 위임하고 엔드포인트는 인증·순회·응답 조립만.

## Public API

| Method | 경로              | Query    | 접근                                     | 설명                                             |
| ------ | ----------------- | -------- | ---------------------------------------- | ------------------------------------------------ |
| GET    | `/api/cron/watch` | (없음)   | Bearer `CRON_SECRET` **또는** admin 쿠키 | 감시 실행 + 저장 + 알림                          |
| GET    | `/api/cron/watch` | `?dry=1` | 동일                                     | 수집·diff 만, **저장·알림 없음**(배포 후 확인용) |

인증 두 경로:

- **Vercel Cron** — env `CRON_SECRET` 이 있으면 Vercel 이 `Authorization: Bearer <secret>` 을 붙여 호출한다. 상수시간 비교. `CRON_SECRET` 미설정이면 이 경로는 닫힌다(빈 토큰 일치 금지) → cron 호출은 401 이 되고 admin 만 수동 실행 가능.
- **admin 쿠키** — `profiles.is_admin`(health.ts 와 동일 기준). 브라우저에서 `https://radsafety.kr/api/cron/watch?dry=1` 로 눈으로 확인.

응답(JSON, `Cache-Control: no-store`):

```json
{
    "ok": true,
    "dry": false,
    "ts": "2026-09-21T22:00:12.000Z",
    "ms": 2310,
    "results": [
        {
            "source": "kins-sos",
            "status": "ok",
            "count": 158,
            "added": ["제목"],
            "changed": [],
            "removed": [],
            "consecutiveFailures": 0
        },
        {
            "source": "kins-pub",
            "status": "baseline",
            "count": 40,
            "added": [],
            "changed": [],
            "removed": [],
            "consecutiveFailures": 0
        }
    ],
    "bulletins": [{ "source": "nsic", "inserted": 103, "backfilled": true, "pendingTitles": [] }],
    "delivery": { "memberNotified": 17, "telegram": true, "telegramConfigured": true }
}
```

| 코드 | 의미                                                      |
| ---- | --------------------------------------------------------- |
| 200  | 최소 한 소스가 ok/baseline                                |
| 502  | 전 소스 error/suspicious (Vercel cron 로그에 실패로 남김) |
| 401  | 토큰 불일치 + 미인증                                      |
| 403  | 토큰 불일치 + 로그인은 됐으나 admin 아님                  |

## 스케줄 (`vercel.json`)

`{"crons":[{"path":"/api/cron/watch","schedule":"0 22 * * *"}]}` — 07:00 KST(±59분, Hobby 정밀도). Hobby 는 cron 당 **하루 1회** 가 최소 간격이고 개수는 100개까지라 소스가 늘어도 이 cron 하나가 순서대로 돈다(소스별 try/catch 격리는 엔진이 보장). 시각 변경 = 이 한 줄(UTC = KST − 9h) + `main` 머지.

## 사이드 이펙트

`watch_items`/`watch_sources` 쓰기, `notifications` insert, 웹푸시, 텔레그램 — 모두 `dry=1` 이면 없음. 외부 요청은 RASIS 목록 API 2회.

## 핵심 규칙

1. `prerender = false`.
2. **비밀값 미반환** — 응답에 토큰·지문·메타 없음(건수·제목만).
   3a. **K-1 배선(2026-09-20)**: 소스별 `runSource` 뒤 `ingestBulletins(source.id, r.items, {persist:!dry})` — 원안위·NSIC 만 대상(그 외 null). 최초 실행은 NSIC 백필(published). dry 는 계획만 세우고 `pendingTitles` 로 보여 준다.
3. 소스 하나 실패가 전체를 500 으로 만들지 않는다(엔진이 throw 하지 않음). 전부 실패했을 때만 502.
4. 알림 전달 실패도 응답 실패로 바꾸지 않는다(`delivery` 로만 보고). `delivery.telegramConfigured` 는 env 가 런타임에 읽혔는지의 진단값(값 아님) — 2026-09-20 첫 cron 실행에서 `import.meta.env` 미인식이 실측돼 추가.
5. `CRON_SECRET` 은 Vercel env(Production) — `.env.example` 참고, `PUBLIC_` 접두 금지.

## 관련

- `.spec/src/lib/watch/engine.md` · `notify.md` · `sources/*.md` · `.spec/sql_query/migrate_add_watch_tables.md`
- 테스트: `tests/unit/pages/api-cron-watch.test.ts`
- 운영 문서: `documents/external_services_guide.md` §2-3-1(`CRON_SECRET`), `documents/privacy_redesign_plan.md` K-3
