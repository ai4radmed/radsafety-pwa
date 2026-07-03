# 명세: src/lib/health-checks.ts

## 역할 요약

Doctor 점검 함수 모음. 요청 흐름 순서의 **6개 층**을 각각 독립 함수로 프로브해 `CheckResult` 를 반환한다. 부작용 없음(읽기·설정 확인만). `src/pages/api/health.ts` 가 `runChecks(mode)` 로 호출한다. 엔드포인트를 얇게 유지하고 점검 로직을 테스트 가능하게 분리하기 위해 `lib` 로 뺀다(기존 `email.ts`·`push.ts` 등과 동일 패턴).

## Public API

```ts
type CheckResult = {
    name: string; // "app-host" | "config" | "db-ping" | ...
    layer: 1 | 2 | 3 | 4 | 5 | 6;
    ok: boolean;
    ms: number; // 소요 밀리초
    detail?: string; // 실패 시 사람이 읽을 짧은 사유(비밀값 없음)
};

function runChecks(mode: 'shallow' | 'deep'): Promise<CheckResult[]>;
```

층별 점검 함수:

| 함수                | layer    | 점검 내용                                                                                              | shallow |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------ | ------- |
| `checkAppHost()`    | ① Vercel | 배포 버전·리전·env 로드 여부(응답 도달 자체가 생존 증거)                                               | ✓       |
| `checkConfig()`     | ② 설정   | env **존재·형식**: SUPABASE URL/anon/service, RESEND_API_KEY, VAPID pair, ADMIN_EMAILS                 | ✓       |
| `checkSupabase()`   | ③ 백엔드 | shallow=DB 경량 핑(`profiles` head/count); deep=+Auth 도달·Storage 도달                                | ✓(DB만) |
| `checkSchema()`     | ④ 데이터 | 핵심 테이블 존재: profiles·findings·notifications·verification_requests·archives·feedback              | (deep)  |
| `checkFunctional()` | ⑤ 기능   | `resend-config`(RESEND*API_KEY `re*`접두) ·`vapid-pair`(페어 base64url 형식·길이) — **발송·변경 없음** | (deep)  |
| `checkMeta()`       | ⑥ 메타   | APP_VERSION·APP_RELEASE_DATE·빌드시각·(가능시 git sha)·ts                                              | ✓       |

`runChecks('shallow')` = `checkAppHost` + `checkConfig` + `checkSupabase(DB핑)` + `checkMeta`.
`runChecks('deep')` = 위 + `checkSupabase(Auth·Storage)` + `checkSchema` + `checkFunctional`.

> **범위 주석(as-built)**: ⑤의 **콘텐츠 컬렉션 로드(`inspection_prep`)** 는 `astro:content` 컨텍스트가 필요해 `lib` 순수성·유닛 테스트성을 지키려 **엔드포인트 deep 경로에서 `content` 점검(layer 5)** 으로 수행한다(이 lib 밖). 초안 명세의 "OTP 경로 존재" 점검은 ② `config`(Supabase URL/anon 존재) + ③ `auth-reach`(deep) 에 포섭되어 별도 함수로 두지 않는다.
>
> **RLS 검증은 여기 없다**: 실제 로그인(부작용)·`DEV_TEST_USER_*` 자격이 필요해 런타임 프로브가 아닌 **e2e 보안 테스트**로 분리했다 → `.spec/tests/e2e/rls-policies.spec.md`. `RESEND_FROM_EMAIL` 은 `email.ts` 가 발신 주소를 하드코딩하므로 앱이 참조하지 않아 점검 대상에서 제외.

## 사이드 이펙트

**없음.** Supabase 읽기 쿼리(head/count·존재 확인)·env 읽기·콘텐츠 컬렉션 로드만 수행. 쓰기·메일 발송·푸시 발송 금지.

## 핵심 규칙

1. **각 함수는 개별 timeout(기본 3s)·try/catch.** 실패·타임아웃은 `ok:false` + `detail` 로 보고하고 **throw 하지 않는다** — 하나의 실패가 다른 점검을 막지 않게.
2. **비밀값 원문 반환 금지.** `detail` 에도 키·URL·연결문자열·행 값을 넣지 않는다. "missing" / "invalid format" / "unreachable" 같은 범주만.
3. Supabase 프로브는 `supabase-server`(service role)로 **최소 쿼리**(head request, `count: 'exact', head: true`) — 실제 데이터 행을 가져오지 않는다.
4. `checkConfig` 는 값의 **존재와 형식**만 본다(예: URL 파싱 가능, VAPID 키 base64url 길이). 실제 인증 성공은 ③에서.
5. `checkFunctional` 의 VAPID·Resend·OTP 점검은 **자격/설정 유효성만** — 실제 이메일·푸시를 보내지 않는다.
6. `ms` 는 각 점검의 실측 소요시간(모니터링·회귀 진단용).
7. `checkRlsPolicies` 는 **Anon 클라이언트** 및 **테스트 사용자 자격증명**을 통해 RLS 정책을 검증한다.
    - **비인증 가드 검증**: 비로그인 Anon 클라이언트로 `findings` 조회 시 RLS 정책에 의해 정상 차단되는지 확인(데이터 미검출 또는 에러).
    - **무한 재귀 검증**: `DEV_TEST_USER_EMAIL` 및 `DEV_TEST_USER_PASSWORD` 자격증명으로 로그인 완료 후 Anon 클라이언트를 사용해 `profiles`를 count 쿼리할 때, DB 무한 재귀 에러(`infinite recursion`) 없이 정상적으로 수행되는지 검증.
    - **환경변수 부재 시**: 테스트 환경변수 누락 시에는 테스트를 스킵하고 `detail: "skipped: env missing"`을 기록하며 `ok: true`를 유지한다. (운영 환경에서의 강제 실패를 방지)

## 관련

- 소비자: `.spec/src/pages/api/health.md`
- 유닛 명세: `.spec/tests/unit/health-checks.test.md` (예정)
- 참조 상수: `src/consts.ts`(APP_VERSION·APP_RELEASE_DATE) · `.env.example`(점검 대상 env 목록)
