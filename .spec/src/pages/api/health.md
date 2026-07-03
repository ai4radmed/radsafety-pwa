# 명세: src/pages/api/health.ts

## 역할 요약

GET /api/health. 시스템 정상가동을 **요청이 흐르는 순서**(① 앱 호스트 → ② 설정 → ③ 백엔드 → ④ 데이터 → ⑤ 기능 → ⑥ 메타)로 점검해 JSON 반환. 이 응답이 온다는 것 자체가 Vercel·배포·SSR 런타임 생존 증거다(①). 점검 로직은 `src/lib/health-checks.ts` 에 위임하고, 이 엔드포인트는 오케스트레이션·응답 조립만 한다.

## Public API

| Method | 경로        | Query   | 접근       | 설명                                            |
| ------ | ----------- | ------- | ---------- | ----------------------------------------------- |
| GET    | /api/health | (없음)  | 공개       | shallow — ① 앱 응답 · ② 설정 · ③ DB 핑 · ⑥ 메타 |
| GET    | /api/health | ?deep=1 | admin only | deep — 위 + ③(Auth·Storage) · ④ 스키마 · ⑤ 기능 |

응답 본문(JSON):

```json
{
    "status": "ok", // "ok" | "degraded" | "down"
    "mode": "shallow", // "shallow" | "deep"
    "version": "0.2.1", // APP_VERSION
    "releaseDate": "2026-03-20", // APP_RELEASE_DATE
    "ts": "2026-07-01T12:34:56.789Z", // 이 응답을 방금 계산한 시각(신선도 증거)
    "checks": [
        { "name": "app-host", "layer": 1, "ok": true, "ms": 2 },
        { "name": "config", "layer": 2, "ok": true, "ms": 0 },
        { "name": "db-ping", "layer": 3, "ok": true, "ms": 41 },
        { "name": "meta", "layer": 6, "ok": true, "ms": 0 }
    ]
}
```

상태코드:

| 코드 | 의미                                                         |
| ---- | ------------------------------------------------------------ |
| 200  | status = ok \| degraded (부가 기능만 실패해도 200)           |
| 503  | status = down — 핵심(앱·DB) 점검 실패                        |
| 401  | ?deep=1 인데 미인증                                          |
| 403  | ?deep=1 인데 로그인은 됐으나 admin(PUBLIC_ADMIN_EMAILS) 아님 |

## 사이드 이펙트

**없음.** 읽기 전용 프로브만. 실제 메일(Resend)·푸시(VAPID) 발송 금지, DB 쓰기 금지.

## 핵심 규칙

1. `prerender = false` (동적 SSR). 이 응답이 반환된다는 것 자체가 ① 앱 호스트(Vercel)·SSR 런타임 생존의 자기증명.
2. **비밀값 원문 반환 금지.** shallow·deep 모두 각 check 는 `ok`(존재/도달/유효 여부)와 `ms`만 노출. env 값·키·연결문자열·행 데이터를 응답에 담지 않는다.
3. **deep 은 admin 게이트.** `locals.session` 의 이메일이 `PUBLIC_ADMIN_EMAILS` 목록에 있을 때만 deep 점검 수행. 아니면 401/403 후 종료(deep 점검 미실행).
4. 점검은 `src/lib/health-checks.ts` 의 `runChecks(mode)` 호출로만 수행 — 엔드포인트는 mode 판정·인증 게이트·status 집계·응답 직렬화만. **예외**: deep 모드에서 `content` 점검(`getCollection('inspection_prep')`, layer 5)만 엔드포인트가 추가한다(`astro:content` 컨텍스트가 여기서만 가능 — lib 명세의 as-built 주석 참조).
5. **status 집계**: `checkAppHost`·`db-ping` 등 **핵심 층**(layer 1·3 DB) 실패 → `down`(503). 그 외 부가 층(④⑤ 및 ③의 Auth/Storage) 실패 → `degraded`(200). 전부 ok → `ok`(200).
6. **신선도**: 응답 `ts` 는 요청 처리 시각(서버에서 매 호출 계산) — 정적 200·캐시 착시와 구별하는 증거. `Cache-Control: no-store` 헤더.
7. 개별 점검 실패가 엔드포인트 전체를 500 으로 떨어뜨리지 않는다 — `runChecks` 가 각 점검을 try/catch 로 감싸 `ok:false` 로 보고하므로, 엔드포인트는 항상 구조화된 JSON(200/503)을 반환.

## 관련

- 점검 함수 명세: `.spec/src/lib/health-checks.md`
- e2e 명세: `.spec/tests/e2e/health.spec.md` (예정)
- 설계 배경(6층·shallow/deep·① Vercel 재배치): 대화 아티팩트 `doctor-order` / `one-https` / `login-order`
