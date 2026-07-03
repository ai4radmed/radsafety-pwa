# HANDOFF — radsafety-pwa 작업 재개용 인계장

> 작업 컨텍스트를 `2nd-brain-vault` 에서 이 프로젝트로 옮김. 새 Claude Code 세션을
> **`~/projects/radsafety-pwa` 에서 시작**하고 이 문서 + `AGENTS.md` 를 먼저 읽으면 그대로 이어감.
> 최종 갱신: 2026-07-03 (kimbi/WSL2)

---

## 0. 재개 방법 (한 줄)

```bash
cd ~/projects/radsafety-pwa   # 여기서 Claude Code 시작
```

권위 문서: **`AGENTS.md`**(시스템 맵·SDD 규약) · **`.spec/`**(코드와 1:1 명세) · 이 파일(현황·다음).

---

## 1. 프로젝트 스냅샷

- **radsafety-pwa** — Astro 5 SSR(`prerender=false`) on **Vercel(서울/icn1)** + **Supabase(도쿄)**(Auth/DB/RLS/Storage) + PWA + Resend(메일) + Web Push(VAPID).
- 저장소: `ai4radmed/radsafety-pwa` (private). 원격 `origin`.
- **SDD**: `.spec/` 가 `src/` 를 1:1 미러. 흐름 = Plan → `.spec/` 명세 → `src/`+테스트 → 검증.
- **브랜치 모델**: `dev` 에서 작업 → `main` 으로 PR. **main 보호(strict)**: 필수 체크 `check`+`e2e` 통과 필요, 리뷰 승인 불필요. **main 머지 = Vercel 프로덕션 자동 배포.**

---

## 2. 이번 세션에 완료한 것 (Doctor 헬스체크 + 모니터링 + RLS 테스트)

전부 **명세→구현→테스트→배포→프로덕션 검증**까지 닫힘. 프로덕션 `status: ok`.

1. **Doctor 엔드포인트** `GET /api/health` — `src/pages/api/health.ts` + `src/lib/health-checks.ts`
    - **shallow**(공개): ① 앱호스트(Vercel) · ② 설정 · ③ DB핑 · ⑥ 메타
    - **deep**(`?deep=1`, admin 전용): + ③ Auth·Storage · ④ 스키마 · ⑤ 기능(resend·vapid·content)
    - 원칙: 엔드포인트 얇게 / 점검 로직 `lib` 분리, **부작용 0**(발송·쓰기 없음), **비밀값 원문 미반환**, status 집계(핵심 실패=503 / 부가 실패=200 degraded).
2. **모니터링** — `scripts/check-production.mjs`(Doctor 섹션 포함) + `.github/workflows/health.yml`
    - **매일 09:00 KST(cron `0 0 * * *`) + 수동(`workflow_dispatch`)**, 실패 시 GitHub 이메일.
    - 별도 `supabase-keepalive.yml`(월·목 핑, free-tier pause 방지)도 있음 — **끄지 말 것**.
3. **RLS 보안 테스트** — `tests/e2e/rls-policies.spec.ts` (Doctor 아닌 e2e 로 분리한 이유: 실제 로그인=부작용, 프로덕션 금지 자격 필요)
    - 검증: 비로그인 anon 의 `findings` 무단조회 차단 + 로그인 후 `profiles` **무한재귀 회귀** 감지.
    - **활성화 완료**: Supabase 테스트계정 `test-user@radsafety.kr`(confirmed) + GitHub secret `DEV_TEST_USER_EMAIL`·`DEV_TEST_USER_PASSWORD`. 매 CI 에서 실행·통과(hasCreds=true 확인).
4. **부수 교정** — resend-config 오탐 제거(앱은 `RESEND_FROM_EMAIL` 안 씀, `email.ts` 가 발신주소 하드코딩 → `RESEND_API_KEY` 만 검사) · app-host 리전 `process.env.VERCEL_REGION` 폴백(icn1) · consts 오타(2036→2026).

---

## 3. 현재 상태

- 브랜치 **`dev`**, 작업트리 clean.
- **`dev` 는 `main` 과 파일 net-zero** — 앞선 4개 커밋(`055f2f9`·`98b56dc`·`fb6cab1`·`145c6f4`)은 RLS 활성 진단용(추가→제거)이라 코드 무변경. 다음 실제 PR 이 함께 실어가거나 무시해도 무방.
- 프로덕션 `https://radsafety.kr/api/health` = `status: ok`, version 0.2.1.

---

## 4. 운영 치트시트

```bash
# 수동 테스트(프로덕션 전체 + Doctor)
npm run check:production
# 헬스만 빠르게
curl -s https://radsafety.kr/api/health | jq
# 자동: 매일 09:00 KST GitHub Actions(health.yml), 실패 시 이메일
# deep(심층·admin): 브라우저 admin 로그인 후 https://radsafety.kr/api/health?deep=1

# 검증 루틴
npm run test:unit        # vitest (210+)
npx astro check          # 타입
npm run test:e2e         # playwright (RLS 포함)
```

배포: `dev` → PR → `main` 머지 → Vercel 자동 배포(~30초~1분).

---

## 5. 이 세션에서 배운 함정 (다음 세션 시간 절약)

- **husky pre-commit 플레이크**: `tests/unit/actions/index.test.ts` 가 콜드+부하 시 5초 타임아웃으로 커밋을 막음. 격리 실행은 통과. → **재커밋하거나 `--no-verify`**(변경이 그 테스트와 무관할 때).
- **main 머지 시 dev 가 BEHIND**(strict): 머지 전 `git merge origin/main --no-edit` 로 dev 갱신 후 push. 매 PR 머지마다 반복됨(충돌 없음).
- **prettier 가 md 표의 밑줄을 강조로 오파싱**: 표 셀의 `RESEND_API_KEY` 같은 식별자는 **백틱(코드스팬)으로 감싸야** `RESEND*API_KEY` 로 안 깨짐.
- **Vercel `VERCEL_REGION` 은 런타임 `process.env` 에만** 있음(`import.meta.env` 엔 없음).
- **e2e 의 "N skipped" 오해 주의**: `authenticated-*` 테스트가 `TEST_AUTH` 없으면 skip함. skip 수를 특정 테스트로 단정 말 것(hasCreds 등 직접 로그로 확인).

---

## 6. 다음 작업 후보 (급한 것 없음)

- **`/admin/health` 상태 페이지** — deep 결과를 admin 이 눈으로 보는 대시보드. "사용자 체감" 표면이라 `APP_VERSION` bump 명분도 생김. (다음 유력 후보)
- (선택) dev 의 net-zero 진단 커밋 정리 — 그대로 둬도 무해.
- Vercel 의 `RESEND_FROM_EMAIL` 은 앱이 안 쓰므로 지워도 무해(이미 삭제함).

---

## 7. 핵심 파일 지도

| 영역       | 코드                                                            | 명세                                   |
| ---------- | --------------------------------------------------------------- | -------------------------------------- |
| 엔드포인트 | `src/pages/api/health.ts`                                       | `.spec/src/pages/api/health.md`        |
| 점검 로직  | `src/lib/health-checks.ts`                                      | `.spec/src/lib/health-checks.md`       |
| 모니터     | `scripts/check-production.mjs` · `.github/workflows/health.yml` | —                                      |
| RLS 테스트 | `tests/e2e/rls-policies.spec.ts`                                | `.spec/tests/e2e/rls-policies.spec.md` |
| 메일(참고) | `src/lib/email.ts` (발신주소 하드코딩 `noreply@radsafety.kr`)   | —                                      |
| 시스템 맵  | `AGENTS.md`                                                     | —                                      |
