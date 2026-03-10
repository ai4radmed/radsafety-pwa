# 외부 서비스 설정 및 검증 절차서

> 이 문서는 RadSafety PWA가 의존하는 외부 서비스의 **올바른 설정값**과 **검증 방법**을 정리합니다.

## 1. Supabase

> 서버구축없이 로그인, 데이터베이스, 스토리지 기능을 구현할 수 있는 오픈소스 BaaS  
> Vercel을 front-end로 웹서비스 구현

## 1-1. 설정

- 조직(Organization=AI4RADMED)을 설정하고
- 그 안에 프로젝트(Project=RadsSfety)를 생성한다.
- Region은 Seoul(ap-northeast-2)로 설정한다.

## 1-2. API 연결 설정 (URL & Keys)

> 앱이 Supabase와 대화하기 위한 **통로(URL)**와 **열쇠(Keys)**를 확보하는 단계입니다.

- **Project URL (API URL)**:
    - **확인 경로**: `Supabase Dashboard > Integrations > Data API`
    - **특징**: 이 주소 하나로 **데이터베이스, 파일 스토리지, 사용자 인증(Auth)** 기능을 모두 통합하여 처리합니다.
- **API Keys (열쇠)**:
    - **확인 경로**: `Supabase Dashboard > Project Settings > API Keys`
    - **Publishable key (Anon Key)**: 브라우저(Front-end)에서 안전하게 사용할 수 있는 공개 열쇠입니다. (RLS 보안 기능과 함께 동작)
    - **Secret keys (Service Role Key)**: 절대로 외부에 노출되면 안 되는 관리자용 열쇠입니다. (Vercel 서버 로직에서만 사용)

## 1-3. Authentication (인증)

> 사용자가 누구인지 확인(로그인)하고, 인증된 사용자만 안전하게 접근할 수 있도록 제어하는 설정입니다.

- **로그인 수단**: 카카오톡, 이메일 매직링크/OTP 등 어떤 방식으로 로그인할지 결정합니다.
- **리다이렉트 보안 (URL Config)**: 로그인 성공 후 우리 앱의 올바른 주소(프리뷰, 운영 도메인 등)로 안전하게 되돌려보내는 화이트리스트를 관리합니다.
- **이메일 템플릿**: 비밀번호 없이 로그인할 때 발송되는 안내 메일의 내용을 꾸미는 곳입니다.

### 1-3-1. Providers > Kakao

> 앱에서 사용할 소셜 로그인 수단을 설정합니다.

| 항목          | 설명                                           |
| ------------- | ---------------------------------------------- |
| Client ID     | 카카오 개발자 콘솔에서 발급한 REST API 키      |
| Client Secret | 카카오 개발자 콘솔에서 발급한 Secret           |
| Redirect URL  | Supabase가 자동 생성 (카카오 콘솔에 등록 필요) |

> 관련 검증: [Part 2-1. 카카오 로그인](#2-1-카카오-로그인)

### 1-3-2. URL Configuration

> 인증 성공 후 사용자를 돌려보낼 주소들을 정의합니다.

**설정 경로**: `Supabase Dashboard > Authentication > URL Configuration`

| 항목              | 기능 및 설명                                                                                                                                                                          | 올바른 값                |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------- |
| **Site URL**      | **최종 목적지(본진)**: 앱의 대표 주소이자, 별도의 요청이 없을 때 기본적으로 되돌아갈 고정 경로입니다.                                                                                 | `https://radsafety.kr`   |
| **Redirect URLs** | **허용 목록(화이트리스트)**: 프리뷰 도메인(`*.vercel.app`)처럼 'Site URL' 이외의 다른 주소로 리다이렉트가 필요할 때, Supabase가 "믿고 보내도 되는 주소"인지 검증하는 보안 명단입니다. | 아래 목록 전체 포함 필수 |

**Redirect URLs 목록:**

```
https://radsafety.kr/auth/callback
https://www.radsafety.kr/auth/callback
https://*-benkoreas-projects.vercel.app/auth/callback
```

> **정책**: 보안을 강화하고 리다이렉트 실패(홈 화면으로 튕기는 현상)를 방지하기 위해 **로그인 인증 콜백 주소만 정확히 명시(Exact Match)**해야 합니다.
> 넓은 범위의 와일드카드(`https://radsafety.kr/**`)는 오픈 리다이렉트 취약점을 유발할 수 있으며, OAuth 제공자의 쿼리 파라미터와 충돌하여 리다이렉트를 실패하게 만드는 원인이 됩니다.
>
> **주의 (Vercel Preview 환경)**:
>
> - Vercel 프리뷰 도메인과 같이 도메인이 계속 바뀌는 환경은 어쩔 수 없이 와일드카드를 사용하되, **경로는 `/auth/callback`으로 고정**합니다.
> - 예: `https://*-benkoreas-projects.vercel.app/auth/callback`
>
> 로컬 개발 환경에서는 매직링크 테스트가 불가능하며, 배포 후 운영(또는 프리뷰)에서 테스트합니다.
> (상세: [Part 2-2. 이메일 매직링크](#2-2-이메일-매직링크))
>
> **삭제된 항목 및 이유:**
>
> - `https://radsafety.kr/**` 및 `https://www.radsafety.kr/**` — 보안 위험 및 리다이렉트 충돌을 방지하기 위해 정확한 경로(`/auth/callback`)로 대체되었습니다.
> - `http://localhost:4321/auth/callback` — 매직링크 수신불가로 삭제했었으나, 소셜 로그인 로컬 테스트가 필요하다면 추가할 수 있습니다.
> - `http://localhost:4321/**` 및 `http://localhost:4322/**` — 불필요한 와일드카드

> 관련 검증: [Part 2-1. 카카오 로그인](#2-1-카카오-로그인), [Part 2-2. 이메일 매직링크](#2-2-이메일-매직링크)

### 1-3-3. Email Templates (이메일 OTP — 6자리 코드)

> 비밀번호 없이 이메일로 발송되는 인증 코드 형식을 설정합니다.

앱에서 **이메일 6자리 OTP** 방식으로 로그인하므로, Supabase에서 **Magic Link** 템플릿을 **6자리 코드가 노출되도록** 수정해야 합니다.

**설정 경로**: `Supabase Dashboard > Authentication > Email Templates > Magic Link`

**올바른 템플릿 예시 (6자리 OTP용):**

```html
<h2>RadSafety 로그인 인증 코드</h2>
<p>아래 6자리 코드를 앱 로그인 화면에 입력하세요.</p>
<p style="font-size:24px; font-weight:bold; letter-spacing:0.2em;">{{ .Token }}</p>
<p>이 코드는 제한 시간 내에 한 번만 사용할 수 있습니다.</p>
```

**필수 사항:**

- **`{{ .Token }}`** 변수를 반드시 포함해야 합니다. 이 값이 이메일로 전송되는 6자리 숫자 코드입니다.
- `{{ .Token }}` 없이 `{{ .TokenHash }}` 링크만 있으면 매직링크 방식이 되어, PWA 내부에서 세션이 유지되지 않는 문제가 발생합니다.

**참고:** 동일한 `signInWithOtp` API를 쓰더라도, 이메일 템플릿에 `{{ .Token }}`이 있으면 Supabase가 6자리 코드를 생성해 이메일로 보내고, 앱에서는 `verifyOtp({ email, token, type: 'email' })`로 검증합니다.

> 관련 검증: [Part 2-2. 이메일 OTP](#2-2-이메일-otp)

### 1-3-4. Email (SMTP Settings: 발송 제한 해제)

> Supabase 기본 이메일 서버의 엄격한 발송 제한(1시간 2회)을 우회하기 위해 커스텀 이메일 서버를 연결합니다.

앱에서 이메일 인증 코드를 원활하게 발송하려면, 우리가 이미 세팅해둔 **Resend** 서비스를 Supabase의 SMTP 서버로 지정해야 합니다.

**설정 경로**: `Supabase Dashboard > Authentication > Email` 화면 아래쪽의 **SMTP Settings** 영역

| 항목                   | 설정값                    | 비고                                             |
| :--------------------- | :------------------------ | :----------------------------------------------- |
| **Enable Custom SMTP** | `ON` (활성화)             | 토글 스위치 켜기                                 |
| **Sender email**       | `noreply@radsafety.kr`    | Resend에 등록된 발신 전용 도메인 이메일          |
| **Sender name**        | `RadSafety` (또는 자유)   | 수신자 메일함에 표시될 보낸 사람 이름            |
| **Host**               | `smtp.resend.com`         | Resend SMTP 서버 주소                            |
| **Port**               | `465`                     | SSL 권장 포트                                    |
| **Username**           | `resend`                  | 고정값 (모두 소문자)                             |
| **Password**           | `re_...` (Resend API Key) | **Resend Dashboard > API Keys**에서 생성한 키 값 |

> [!IMPORTANT]
> **왜 중요한가요?**: 이 설정을 하지 않으면, 테스트 중이나 사용자가 몰릴 때 "Too many requests" 에러가 발생하며 이메일 전송이 차단되어 앱 로그인이 완전히 불가능해집니다.

## 1-4. 환경 변수

| 변수명                      | 용도                      | 위치           |
| --------------------------- | ------------------------- | -------------- |
| `PUBLIC_SUPABASE_URL`       | Supabase 프로젝트 URL     | `.env`, Vercel |
| `PUBLIC_SUPABASE_ANON_KEY`  | 클라이언트용 공개 키      | `.env`, Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버용 비밀 키 (RLS 우회) | `.env`, Vercel |

> 키 확인: Supabase Dashboard > Settings > API

## 1-5. Database > SQL (RPC 함수)

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

## 2. Vercel

> GitHub 저장소와 연동되어 웹 서비스를 자동 배포하고 호스팅하는 프론트엔드 플랫폼  
> 모든 커밋에 대해 독립적인 **Preview** 환경을 제공하여 안전한 테스트가 가능합니다.

## 2-1. 설정 (Project & Region)

> 프로젝트의 기본 정보와 서버의 물리적 위치를 설정합니다.

- **대시보드**: https://vercel.com (프로젝트: `radsafety-pwa`)
- **리전(Region)**: `Seoul (icn1)`
    - **설정 경로**: `Vercel Dashboard > Settings > Functions > Service Region`
    - **중요**: 한국 사용자에게 가장 빠른 응답 속도를 제공하기 위해 서버리스 함수 실행 리전을 서울로 지정합니다.

## 2-2. 도메인 설정 (Domains)

> 주소를 관리하고, 주소 통합(www 리다이렉트)을 설정합니다.

| 도메인             | 역할                                                 |
| ------------------ | ---------------------------------------------------- |
| **`radsafety.kr`** | **Primary Domain**: 실제 서비스가 운영되는 공식 주소 |
| `www.radsafety.kr` | **Redirect**: 공식 주소로 자동 연결 (308 Redirect)   |
| `*-*.vercel.app`   | **Preview**: 개발/테스트용 주소 (커밋마다 자동 생성) |

## 2-3. 환경 변수 및 리다이렉트 로직

> 외부 서비스 연동에 필요한 비밀 키를 관리하고, 도메인 변경에 유연하게 대응하는 로직을 포함합니다.

### 2-3-1. Environment Variables

**설정 경로**: `Vercel Dashboard > Settings > Environment Variables`

| 변수명                      | Scope (적용 범위)              | 비고                   |
| :-------------------------- | :----------------------------- | :--------------------- |
| `PUBLIC_SUPABASE_URL`       | All (Production, Preview, Dev) | Supabase API URL       |
| `PUBLIC_SUPABASE_ANON_KEY`  | All                            | Supabase 공개 키       |
| `SUPABASE_SERVICE_ROLE_KEY` | All                            | 서버 전용 비밀 키      |
| `RESEND_API_KEY`            | All                            | 이메일 발송용 API 키   |
| `PUBLIC_VAPID_KEY`          | All                            | 웹 푸시 알림용 공개 키 |

> 상세 목록은 [## 1-4. 환경 변수](#1-4-환경-변수) 섹션을 참조하세요.

### 2-3-2. 동적 리다이렉션 메커니즘

Vercel 프리뷰 환경(`*.vercel.app`)에서도 로그인이 끊기지 않도록 아래 원칙을 준수합니다.

- **원리**: 브라우저의 `window.location.origin`을 활용하여 현재 접속 중인 도메인을 Supabase에 실시간으로 전달합니다.
- **흐름**: [프리뷰 접속] → [로그인 요청 시 현재 주소 전달] → [Supabase 허용 목록 확인] → [정확히 해당 프리뷰 주소로 복귀]

## 2-4. 빌드 및 배포 설정 (Build Settings)

> 소스 코드를 실행 가능한 웹 앱으로 변환하는 과정을 설정합니다.

| 항목                 | 값                               | 비고                       |
| :------------------- | :------------------------------- | :------------------------- |
| **Framework Preset** | `Astro`                          | 사용하는 웹 프레임워크     |
| **Build Command**    | `npm run build`                  | 빌드 실행 명령어           |
| **Install Command**  | `npm install --legacy-peer-deps` | 의존성 충돌 방지 옵션 필수 |

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

#### 4-1. 애플리케이션 등록 (서비스 연동)

서비스 전체가 카카오 인증 인프라를 사용하기 위한 설정입니다.

| 항목              | 설정 경로        | 값                                              |
| :---------------- | :--------------- | :---------------------------------------------- |
| **사이트 도메인** | [플랫폼] > [Web] | `https://radsafety.kr`, `http://localhost:4321` |
| **Redirect URI**  | [카카오 로그인]  | Supabase의 Kakao Provider 페이지에 표시된 URL   |

> [!IMPORTANT]
> **주소 입력의 의미**: 카카오는 보안을 위해 등록된 도메인에서 온 요청만 처리합니다. `사이트 도메인`에는 서비스가 실행되는 모든 주소를, `Redirect URI`에는 인증 완료 후 정보를 전달받을 Supabase 서버 주소를 입력해야 합니다.

#### 4-2. 연결(Connection)의 종류와 차이점

유지보수 및 테스트 시 '연결을 끊는다'는 말이 무엇을 의미하는지 구분해야 합니다.

1.  **서비스 전체 연동 (App Integration)**
    - **위치**: 카카오 디벨로퍼스 > 내 애플리케이션 관리
    - **개념**: `RadSafety` 서비스 자체가 카카오 로그인을 사용할 권한을 얻는 설정입니다.
    - **영향**: 이걸 삭제하거나 차단하면 **모든 사용자가 카카오 로그인을 쓸 수 없습니다.** (운영 중 절대 금지)
2.  **개인별 사용자 연결 (User Connection)**
    - **위치**: 사용자 개인의 카카오톡 설정 > 카카오계정 > 연결된 서비스 관리
    - **개념**: 특정 개인이 "내 정보를 이 앱에 주겠다"고 승인한 상태입니다.
    - **영향**: 특정 사용자만 연결을 끊는 행위이며, **다른 사용자나 서비스 운영에는 아무런 영향이 없습니다.** 테스트 시 '신규 가입' 경험을 재현하기 위해 사용합니다.

#### 4-3. 동의 항목

| 항목                              | 동의 수준 |
| :-------------------------------- | :-------- |
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

### 2-2. 이메일 OTP

**관련 설정**: Supabase(1-1, 1-2), Vercel(2-1, 2-2)

> **⚠️ 테스트 제약 조건**: 이메일 OTP는 반드시 **배포(push) 후 운영 서버**에서 테스트해야 합니다.
>
> 이유: Supabase Site URL이 `https://radsafety.kr`로 고정되어 있어, 로컬에서 로그인을 시도해도
> OTP 이메일은 운영 도메인 기준으로 발송됩니다.
>
> **테스트 순서**: 코드 수정 → `git push` → Vercel 배포 완료 확인 → `radsafety.kr`에서 테스트

| #   | 절차                                             | 예상 결과                                                        |
| --- | ------------------------------------------------ | ---------------------------------------------------------------- |
| 1   | 로그인 페이지에서 이메일 입력 → "인증 코드 받기" | "이메일로 인증 코드를 보냈습니다" 등 안내, 2단계(코드 입력) 표시 |
| 2   | 수신된 이메일에서 6자리 숫자 확인                | `{{ .Token }}` 값이 메일 본문에 표시됨                           |
| 3   | 앱 로그인 화면에 6자리 코드 입력 → 인증하기      | 같은 탭에서 `/mypage`로 이동 (PWA 세션 유지)                     |

**실패 시 확인 순서**:

1. 이메일에 **6자리 코드가 안 보이고 링크만 있으면** → Supabase 이메일 템플릿에 `{{ .Token }}` 포함 여부 확인 (1-2 참조)
2. 코드 입력 후 "인증 실패" 또는 `/login` 유지 → 토큰 만료(기본 1시간) 또는 이미 사용된 코드 → 새 코드 요청
3. 이메일 자체가 오지 않음 → Supabase Auth > Rate Limits, SMTP(사용 시) 설정 확인

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

### 2-7. 웹 푸시 알림

**관련 설정**: Vercel(2-2 VAPID 키), Supabase(`push_subscriptions` 테이블)

> **참고**: 푸시 알림은 로그인 시 `DashboardLayout.astro`에서 자동으로 구독을 시도합니다.
> 사용자에게는 최초 1회 브라우저 권한 팝업이 표시되며, 허용하면 이후 자동으로 구독됩니다.
> 구독 상태는 `/settings` 페이지의 "알림 설정" 카드에서 확인할 수 있습니다.
> 개발 서버(`astro dev`)에서는 SW가 미등록 상태로 "앱 설치 후 자동 활성화"가 표시되며 정상입니다.
> 반드시 배포(Vercel Preview 또는 Production)에서 테스트하세요.

| #   | 절차                                   | 예상 결과                                         |
| --- | -------------------------------------- | ------------------------------------------------- |
| 1   | 배포 환경에서 로그인                   | 브라우저 알림 권한 팝업 자동 표시                 |
| 2   | 권한 허용                              | `/settings` → 알림 설정에 "활성화됨" 표시         |
| 3   | 관리자가 알림 발송 또는 인증 승인/거부 | 기기 상단에 푸시 알림 팝업 표시                   |
| 4   | 알림 탭                                | 앱 열림 + 해당 페이지로 이동                      |
| 5   | (선택) 권한 차단 후 재방문             | `/settings` 알림 설정에 "차단됨" + 허용 안내 표시 |

**실패 시 확인 순서**:

1. Vercel 환경 변수에 `PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` 설정 여부 확인
2. Supabase에 `push_subscriptions` 테이블 존재 여부 확인 → `rebuild_all_tables.sql` 재실행
3. 브라우저 설정 > 알림에서 해당 사이트의 알림이 "허용"인지 확인
4. 브라우저 콘솔에서 `자동 푸시 구독 실패` 경고 메시지 확인 → 원인 파악
5. iOS Safari의 경우 홈 화면에 PWA로 설치되어 있어야 함 (Safari 직접 접속 시 푸시 미지원)
6. Vercel 함수 로그에서 `push-subscribe` 모듈의 에러 확인

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

| 변경한 설정                                       | 재검증 필요 항목 |
| ------------------------------------------------- | ---------------- |
| Supabase Site URL / Redirect URLs                 | 2-1, 2-2         |
| Supabase Email Template                           | 2-2              |
| Supabase Kakao Provider                           | 2-1              |
| Supabase SQL (RPC, RLS)                           | 2-5, 2-6         |
| Vercel Domain                                     | 2-1, 2-2, 2-3    |
| Vercel 환경 변수                                  | 2-1, 2-2, 2-4    |
| Cloudflare DNS                                    | 2-3, 2-4         |
| Cloudflare SSL                                    | 2-3              |
| 카카오 앱 설정                                    | 2-1              |
| Resend API Key / Domain                           | 2-4              |
| 코드: `pages/auth/*`                              | 2-1, 2-2         |
| 코드: `lib/email.ts`                              | 2-4, 2-6         |
| 코드: `rebuild_all_tables.sql`                    | 2-5, 2-6         |
| Vercel VAPID 환경 변수                            | 2-7              |
| 코드: `lib/push.ts`                               | 2-7              |
| 코드: `public/sw-push.js`                         | 2-7              |
| 코드: `pages/api/push/subscribe.ts`               | 2-7              |
| 코드: `pages/api/push/unsubscribe.ts`             | 2-7              |
| 코드: `layouts/DashboardLayout.astro` (자동 구독) | 2-7              |
| 코드: `pages/settings.astro` (알림 상태 표시)     | 2-7              |

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
