# 외부 서비스 설정 및 검증 절차서

> 이 문서는 RadSafety PWA가 의존하는 외부 서비스의 **올바른 설정값**과 **검증 방법**을 정리합니다.
> 코드가 정상이어도 외부 설정이 틀리면 장애가 발생합니다.

## 장애 사례 기록

| 날짜       | 증상                                     | 원인                                                                                                                           | 해결                                |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 2026-02-16 | 매직링크 클릭 시 파일 다운로드           | `/auth/confirm`에 `prerender = false` 누락 → 정적 파일로 빌드됨                                                                | `prerender = false` 추가 후 재배포  |
| 2026-02-17 | 매직링크 클릭 시 `/login`으로 리다이렉트 | 위 장애 수정 전 Vercel CDN이 `/auth/confirm`을 `308 Permanent Redirect`로 캐시 → 코드 수정 후에도 캐시가 남아 서버 코드 미실행 | 새 배포(git push)로 CDN 캐시 무효화 |

### CDN 308 캐시 장애 패턴

이 프로젝트에서 반복될 수 있는 패턴입니다. 아래를 숙지하세요.

**발생 조건**:

1. 특정 경로(예: `/auth/confirm`)가 한 번이라도 `308 Permanent Redirect`로 응답한 적이 있음
2. Vercel CDN 또는 브라우저가 이 응답을 캐시함
3. 이후 코드를 올바르게 수정해도 캐시가 먼저 반환되어 수정이 반영 안 됨

**진단 방법** (Vercel Dashboard → Logs):

```
정상: GET /auth/confirm  200  (서버 코드 실행, 100ms 이상)
문제: GET /auth/confirm  308  Cache: 308 Permanent Redirect  (12ms, 서버 코드 미실행)
```

**해결 방법**:

```bash
# 새 배포로 CDN 캐시 무효화
git commit --allow-empty -m "chore: CDN 캐시 무효화"
git push
# 배포 완료 후 브라우저 캐시도 삭제 (개발자 도구 → Application → Clear site data)
```

**재발 방지**: `prerender = false`를 누락하지 않으면 이 문제는 발생하지 않습니다.
→ 자동 검증: `tests/unit/pages/prerender-check.test.ts` (CI에서 자동 실행)

---

## Part 1. 서비스별 설정

### 1. Supabase

**대시보드**: https://supabase.com/dashboard (프로젝트: wfnvvczfzbqzhjrxxznq)
**리전**: Tokyo (ap-northeast-1)

#### 1-1. Authentication > URL Configuration

| 항목          | 올바른 값                |
| ------------- | ------------------------ |
| Site URL      | `https://radsafety.kr`   |
| Redirect URLs | 아래 목록 전체 포함 필수 |

**Redirect URLs 목록:**

```
https://radsafety.kr/**
```

> **정책**: Site URL이 `https://radsafety.kr`로 고정이므로 운영 도메인 하나만 필요합니다.
> 로컬 개발 환경에서는 매직링크 테스트가 불가능하며, 배포 후 운영에서 테스트합니다.
> (상세: [Part 2-2. 이메일 매직링크](#2-2-이메일-매직링크))
>
> **삭제된 항목 및 이유:**
>
> - `http://localhost:4321/auth/callback` — `https://radsafety.kr/**`으로 커버되지 않지만, 로컬 매직링크 테스트 자체가 불가하여 불필요
> - `https://www.radsafety.kr/**` — www는 radsafety.kr로 리다이렉트되므로 불필요
> - `http://localhost:4321/**` — 로컬 매직링크 테스트 불가
> - `http://localhost:4322/**` — 용도 불명확, 불필요
> - `https://radsafety.kr/auth/callback` — `/**` 와일드카드로 커버됨

> 관련 검증: [Part 2-1. 카카오 로그인](#2-1-카카오-로그인), [Part 2-2. 이메일 매직링크](#2-2-이메일-매직링크)

#### 1-2. Authentication > Email Templates > Magic Link

```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">Log In</a></p>
```

> **주의**: `{{ .ConfirmationURL }}` 사용 금지. Supabase verify 엔드포인트를 거치면 JSON 응답 → 브라우저 다운로드 발생.
> 반드시 `{{ .SiteURL }}/auth/confirm` 으로 앱에 직접 연결해야 합니다.

> 관련 검증: [Part 2-2. 이메일 매직링크](#2-2-이메일-매직링크)

#### 1-3. Authentication > Providers > Kakao

| 항목          | 설명                                           |
| ------------- | ---------------------------------------------- |
| Client ID     | 카카오 개발자 콘솔에서 발급한 REST API 키      |
| Client Secret | 카카오 개발자 콘솔에서 발급한 Secret           |
| Redirect URL  | Supabase가 자동 생성 (카카오 콘솔에 등록 필요) |

> 관련 검증: [Part 2-1. 카카오 로그인](#2-1-카카오-로그인)

#### 1-4. 환경 변수

| 변수명                      | 용도                      | 위치           |
| --------------------------- | ------------------------- | -------------- |
| `PUBLIC_SUPABASE_URL`       | Supabase 프로젝트 URL     | `.env`, Vercel |
| `PUBLIC_SUPABASE_ANON_KEY`  | 클라이언트용 공개 키      | `.env`, Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버용 비밀 키 (RLS 우회) | `.env`, Vercel |

> 키 확인: Supabase Dashboard > Settings > API

#### 1-5. Database > SQL (RPC 함수)

`sql_query/rebuild_all_tables.sql` 전체를 SQL Editor에서 실행하면 아래가 생성됩니다:

| RPC 함수               | 용도                         |
| ---------------------- | ---------------------------- |
| `delete_own_account()` | 회원 탈퇴 (SECURITY DEFINER) |

> 관련 검증: [Part 2-5. 회원 탈퇴](#2-5-회원-탈퇴)

#### 1-6. Storage Buckets

| 버킷                   | 용도          | 공개          |
| ---------------------- | ------------- | ------------- |
| `resources`            | 자료실 파일   | Public        |
| `feedback-attachments` | 의견 첨부파일 | Private (RLS) |

---

### 2. Vercel

**대시보드**: https://vercel.com (프로젝트: radsafety-pwa)
**리전**: Seoul (icn1)

#### 2-1. Domains

| 도메인             | 역할                                        |
| ------------------ | ------------------------------------------- |
| `radsafety.kr`     | **Primary domain** (Production에 직접 연결) |
| `www.radsafety.kr` | `radsafety.kr`로 308 리다이렉트             |

> **Vercel 308 동작**: Vercel은 도메인 리다이렉트에 308(Permanent Redirect)을 기본값으로 사용합니다.
> `www → apex` 리다이렉트의 308은 정상 동작이며, CDN 캐시 장애의 308과는 다릅니다.
> 헬스체크 스크립트(`check:production`)도 www → apex 308을 정상으로 허용합니다.

> 관련 검증: [Part 2-3. 도메인/SSL](#2-3-도메인ssl)

#### 2-2. Environment Variables

Vercel Dashboard > Settings > Environment Variables에 아래 값 설정:

| 변수명                      | Scope                            | 비고                   |
| --------------------------- | -------------------------------- | ---------------------- |
| `PUBLIC_SUPABASE_URL`       | Production, Preview, Development |                        |
| `PUBLIC_SUPABASE_ANON_KEY`  | Production, Preview, Development |                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | 서버 전용              |
| `RESEND_API_KEY`            | Production, Preview, Development | 서버 전용              |
| `RESEND_FROM_EMAIL`         | Production, Preview, Development | `noreply@radsafety.kr` |
| `PUBLIC_ADMIN_EMAILS`       | Production, Preview, Development | 쉼표 구분              |
| `PUBLIC_LOG_LEVEL`          | Production                       | `info`                 |

> 관련 검증: [Part 2-4. 이메일 발송](#2-4-이메일-발송)

#### 2-3. 빌드 설정

| 항목             | 값                               |
| ---------------- | -------------------------------- |
| Framework Preset | Astro                            |
| Build Command    | `npm run build` (기본값)         |
| Install Command  | `npm install --legacy-peer-deps` |
| Output Directory | 자동 감지                        |

---

### 3. Cloudflare

**대시보드**: https://dash.cloudflare.com
**역할**: DNS/CDN만 담당 (SSL은 Vercel이 처리)

#### 3-1. DNS Records

| Type  | Name      | Content                                  | Proxy                |
| ----- | --------- | ---------------------------------------- | -------------------- |
| CNAME | `@`       | `cname.vercel-dns.com`                   | DNS only (회색 구름) |
| CNAME | `www`     | `cname.vercel-dns.com`                   | DNS only (회색 구름) |
| TXT   | `_resend` | Resend 도메인 인증값                     | -                    |
| MX    | `@`       | `feedback-smtp.resend.com` (우선순위 10) | -                    |

> **주의**: Proxy(주황 구름)를 켜면 Vercel과 SSL 충돌 발생. 반드시 DNS only로 설정.

#### 3-2. SSL/TLS

| 항목     | 값            |
| -------- | ------------- |
| SSL Mode | Full (Strict) |

> 관련 검증: [Part 2-3. 도메인/SSL](#2-3-도메인ssl)

---

### 4. 카카오 개발자

**대시보드**: https://developers.kakao.com

#### 4-1. 앱 설정

| 항목                         | 값                                              |
| ---------------------------- | ----------------------------------------------- |
| 플랫폼 > Web > 사이트 도메인 | `https://radsafety.kr`, `http://localhost:4321` |

#### 4-2. 카카오 로그인

| 항목         | 값                                                                   |
| ------------ | -------------------------------------------------------------------- |
| 활성화       | ON                                                                   |
| Redirect URI | Supabase에서 자동 생성된 URL (Supabase > Providers > Kakao에서 확인) |

#### 4-3. 동의 항목

| 항목                              | 동의 수준 |
| --------------------------------- | --------- |
| 닉네임 (profile_nickname)         | 필수      |
| 카카오계정 이메일 (account_email) | 필수      |

> 코드 참조: `src/pages/login.astro:249` — `scope: 'account_email,profile_nickname'`

> 관련 검증: [Part 2-1. 카카오 로그인](#2-1-카카오-로그인)

---

### 5. Resend

**대시보드**: https://resend.com/dashboard
**상세 가이드**: [documents/email_setup_guide.md](email_setup_guide.md)

#### 5-1. API Key

| 항목       | 값                                |
| ---------- | --------------------------------- |
| Key Name   | `radsafety-pwa-production`        |
| Permission | Full Access                       |
| 환경 변수  | `RESEND_API_KEY` (`.env`, Vercel) |

#### 5-2. Domain

| 항목        | 값                                   |
| ----------- | ------------------------------------ |
| 인증 도메인 | `radsafety.kr`                       |
| DNS 레코드  | Cloudflare에 TXT, MX 추가 (3-1 참조) |
| 발신 주소   | `noreply@radsafety.kr`               |

#### 5-3. 발송 용도

| 용도             | From                                              | 코드 위치              |
| ---------------- | ------------------------------------------------- | ---------------------- |
| 이메일 인증 코드 | `방사선안전관리통합시스템 <noreply@radsafety.kr>` | `src/lib/email.ts:74`  |
| 의견 관리자 알림 | `noreply@radsafety.kr`                            | `src/lib/email.ts:200` |

> 관련 검증: [Part 2-4. 이메일 발송](#2-4-이메일-발송)

---

## Part 2. 검증 체크리스트

> 아래 검증은 **배포 후** 또는 **외부 설정 변경 후** 수동으로 수행합니다.
> 각 항목에 관련된 서비스 설정을 표기합니다.

### 2-1. 카카오 로그인

**관련 설정**: Supabase(1-1, 1-3), 카카오(4-1~4-3), Vercel(2-1)

| #   | 절차                              | 예상 결과                            |
| --- | --------------------------------- | ------------------------------------ |
| 1   | `https://radsafety.kr/login` 접속 | 로그인 페이지 표시                   |
| 2   | "카카오 로그인" 클릭              | 카카오 인증 페이지로 이동            |
| 3   | 카카오 계정으로 로그인            | `/auth/callback`으로 리다이렉트      |
| 4   | 콜백 처리 완료                    | `/mypage`로 이동, 닉네임/이메일 표시 |
| 5   | 사이드바 확인                     | 관리자 이메일이면 관리자 메뉴 표시   |

**실패 시 확인 순서**:

1. `/auth/callback`에 `prerender = false` 있는지 확인 → `npm run test:unit`
2. Supabase Redirect URLs에 프로덕션 URL 포함 여부
3. 카카오 콘솔 Redirect URI가 Supabase 값과 일치하는지
4. 브라우저 개발자 도구 Network 탭에서 리다이렉트 체인 확인

### 2-2. 이메일 매직링크

**관련 설정**: Supabase(1-1, 1-2), Vercel(2-1, 2-2)

> **⚠️ 테스트 제약 조건**: 매직링크는 반드시 **배포(push) 후 운영 서버**에서 테스트해야 합니다.
>
> 이유: Supabase Site URL이 `https://radsafety.kr`로 고정되어 있어, 로컬에서 로그인을 시도해도
> 매직링크는 항상 `radsafety.kr/auth/confirm`으로 전송됩니다. 로컬 서버는 이 흐름에 관여하지 않습니다.
>
> **테스트 순서**: 코드 수정 → `git push` → Vercel 배포 완료 확인 → `radsafety.kr`에서 테스트

| #   | 절차                                 | 예상 결과                                                              |
| --- | ------------------------------------ | ---------------------------------------------------------------------- |
| 1   | 로그인 페이지에서 이메일 입력 → 전송 | "이메일로 로그인 링크를 보냈습니다" 알림                               |
| 2   | 수신된 이메일에서 링크 주소 확인     | `https://radsafety.kr/auth/confirm?token_hash=...&type=magiclink` 형태 |
| 3   | 링크 클릭                            | `/mypage`로 이동 (다운로드 아님!)                                      |

**실패 시 확인 순서**:

1. 이메일 링크가 `supabase.co/auth/v1/verify`로 시작하면 → 이메일 템플릿이 잘못됨 (1-2 참조)
2. 링크 클릭 시 다운로드되면 → `/auth/confirm`에 `prerender = false` 확인
3. `/login`으로 리다이렉트되면 → Vercel 로그에서 `[confirm]` 로그 확인 후 아래 진단
    - 로그 없음: CDN 캐시 문제 → 빈 커밋 push로 캐시 무효화
    - `verifyOtp error`: 토큰 만료(1시간) 또는 이미 사용된 링크 → 새 매직링크 재발송
    - `파라미터 누락`: 이메일 템플릿 확인 (1-2 참조)

### 2-3. 도메인/SSL

**관련 설정**: Vercel(2-1), Cloudflare(3-1, 3-2)

| #   | 절차                            | 예상 결과                          |
| --- | ------------------------------- | ---------------------------------- |
| 1   | `https://radsafety.kr` 접속     | 사이트 정상 표시, HTTPS 자물쇠     |
| 2   | `https://www.radsafety.kr` 접속 | `radsafety.kr`로 리다이렉트 (권장) |
| 3   | `http://radsafety.kr` 접속      | HTTPS로 자동 리다이렉트            |

**실패 시 확인 순서**:

1. Cloudflare에서 Proxy가 켜져 있지 않은지 확인 (DNS only 필수)
2. Vercel Domains에서 SSL 인증서 상태 확인
3. Cloudflare SSL Mode가 Full (Strict)인지 확인

### 2-4. 이메일 발송 (인증 코드)

**관련 설정**: Resend(5-1~5-3), Vercel(2-2), Cloudflare(3-1 DNS)

| #   | 절차                                 | 예상 결과                                   |
| --- | ------------------------------------ | ------------------------------------------- |
| 1   | 마이페이지 → 학회/특별사용자 인증 탭 | 인증 폼 표시                                |
| 2   | 이메일 입력 → "인증 코드 발송"       | 성공 메시지                                 |
| 3   | 이메일 수신 확인                     | 6자리 인증 코드 포함 이메일 (스팸함도 확인) |
| 4   | 코드 입력 → 검증                     | 인증 상태 변경                              |

**실패 시 확인 순서**:

1. Vercel 환경 변수 `RESEND_API_KEY`가 설정되어 있는지
2. Resend Dashboard > Emails에서 발송 내역 및 에러 확인
3. 도메인 인증 상태 확인 (Resend > Domains)
4. Cloudflare DNS에 TXT, MX 레코드가 있는지

### 2-5. 회원 탈퇴

**관련 설정**: Supabase(1-5 RPC)

| #   | 절차                          | 예상 결과                             |
| --- | ----------------------------- | ------------------------------------- |
| 1   | 마이페이지 → "회원 탈퇴" 클릭 | 확인 대화상자                         |
| 2   | 확인                          | 로그아웃 → 홈으로 이동                |
| 3   | 같은 계정으로 재로그인 시도   | 새 계정으로 처리됨 (기존 데이터 삭제) |

**실패 시 확인 순서**:

1. `delete_own_account()` RPC 함수가 Supabase에 존재하는지 (SQL Editor에서 확인)
2. `rebuild_all_tables.sql`을 다시 실행

### 2-6. 의견 보내기

**관련 설정**: Supabase(1-6 Storage), Resend(5-3)

| #   | 절차                               | 예상 결과                  |
| --- | ---------------------------------- | -------------------------- |
| 1   | 의견보내기 페이지 → 제목/내용 작성 | 폼 입력 가능               |
| 2   | (선택) 파일 첨부                   | 첨부 표시                  |
| 3   | 전송                               | 성공 메시지                |
| 4   | 관리자 이메일 수신 확인            | 의견 내용 포함 알림 이메일 |
| 5   | `/admin/feedback` 확인             | 목록에 표시                |

---

## Part 3. 설정 변경 시 영향 범위

어떤 서비스 설정을 변경하면 어떤 검증이 필요한지 빠르게 찾기 위한 참조표입니다.

| 변경한 설정                       | 재검증 필요 항목 |
| --------------------------------- | ---------------- |
| Supabase Site URL / Redirect URLs | 2-1, 2-2         |
| Supabase Email Template           | 2-2              |
| Supabase Kakao Provider           | 2-1              |
| Supabase SQL (RPC, RLS)           | 2-5, 2-6         |
| Vercel Domain                     | 2-1, 2-2, 2-3    |
| Vercel 환경 변수                  | 2-1, 2-2, 2-4    |
| Cloudflare DNS                    | 2-3, 2-4         |
| Cloudflare SSL                    | 2-3              |
| 카카오 앱 설정                    | 2-1              |
| Resend API Key / Domain           | 2-4              |
| 코드: `pages/auth/*`              | 2-1, 2-2         |
| 코드: `lib/email.ts`              | 2-4, 2-6         |
| 코드: `rebuild_all_tables.sql`    | 2-5, 2-6         |
