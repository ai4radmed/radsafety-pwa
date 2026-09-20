# 테스트 명세: src/pages/api/cron/watch.ts · vercel.json

## 대상 구현체

- 경로: src/pages/api/cron/watch.ts, vercel.json
- 명세: .spec/src/pages/api/cron/watch.md

## 테스트 도구

Vitest (파일 소스 읽기 기반 — `api-health.test.ts` 패턴). 런타임 로직은 `tests/unit/lib/watch/*` 가 맡는다.

## 검증 항목

| describe          | it                                                     | 검증 내용                                                       |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| /api/cron/watch   | SSR 라우트이며 Bearer CRON_SECRET 을 상수시간 비교한다 | prerender false, `Bearer `, `timingSafeEqual(`, 미설정 시 false |
| /api/cron/watch   | 토큰이 아니면 admin 쿠키(profiles.is_admin)로만 허용   | health.ts 와 같은 판정                                          |
| /api/cron/watch   | dry=1 이면 저장·알림 없이 diff 만                      | `persist: !dry`, delivery 0                                     |
| /api/cron/watch   | 응답은 no-store 이고 비밀값을 되돌리지 않는다          |                                                                 |
| vercel.json crons | 감시 cron 하나가 하루 1회(Hobby 한도)로 등록돼 있다    | `/api/cron/watch`, `분 시 * * *` 형식                           |
