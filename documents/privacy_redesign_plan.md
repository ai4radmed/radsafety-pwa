# 개인정보 최소화 재설계 — 개발 계획

> 상태: 계획 확정 (2026-09-08). 0단계 즉시 조치 · 1단계 로그인 전환 · 2단계 인증 폐지(2-1 업로드 권한 · 2-2 마이페이지 및 삭제 컬럼 · 2-3 회원기관 목록) · 3단계 제도 개선 제안(익명 기본) · **KINS 연계 트랙**(K-1 사건사고 전파 NSIC+NSSC · K-2 KINS 링크, 독립·병행 가능) · **U 트랙** 사용성 모니터링(1단계 A 와 동시 배포). **4단계** 앱 내 법령 Q&A(lawbot) 는 착수 보류, 구조·전략은 확정(선행 과제: 임베딩 재비교).
> 배경: KINS(익명 의견 채널 요청)·대한핵의학회 집행부(회원정보 유출 우려)·대한핵의학기술학회(회원명부 제공 불가) 세 요구를 각각 정확히 겨냥하는 방향으로 재설계한다. 세 요구는 층위가 달라 하나의 해법으로 뭉치지 않는다.

---

## 0단계 — 즉시 조치 (선행, 재설계와 무관)

- `public/archive/` 의 `ksnm 정회원 주소록_20250930*.xlsx`, `대한핵의학회_회원명단_예시.xlsx` 는 실명·개인 이메일·휴대폰이 든 실제 명부이며 `radsafety.kr/archive/...` 에서 인증 없이 HTTP 200 으로 열린다(2026-09-07 확인).
- 조치: 파일 삭제 → git 이력에서 제거 → Vercel 재배포·CDN 캐시 확인 → 학회 통보 여부 결정.
- 이 단계는 1단계보다 먼저, 별도 커밋으로 처리한다.

**추가 확인 사실 (2026-09-08)**: 저장소가 **공개(PUBLIC)** 라 과거 커밋 SHA 로 `raw.githubusercontent.com` 에서도 열렸음. "예시" 파일도 실명단(약 440명, 2026-02-04 유입). 이력에는 `대한핵의학회_회원명단_비밀번호.xlsx`(암호화 CDFV2, 2026-02-04~06) 도 있음. 노출 기간 2026-02-04 ~ 2026-09-08, 항목 실명·이메일·휴대폰·소속. 포크 0.

**진행 상태**

| 단계 | 내용                                                                                                                                                                             | 상태                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | 파일 3개 `git rm` → `main` 직접 push(관리자 예외) → Vercel 배포 → 라이브 404 확인                                                                                                | **완료** — 커밋 `6923707` push 2026-09-08 10:25 KST, 약 30초 후 3개 URL 모두 404 확인(10:26). 정상 자료(PDF) 200 유지                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| B    | `git-filter-repo` 로 4개 경로 전 이력 제거 → 보호 규칙 일시 해제 → 4개 브랜치 force-push → 규칙 복구 → ai4lt 재clone(핸드오프) → GitHub Support 캐시 정리 요청(공개 저장소 필수) | **기술 조치 완료 2026-09-08 10:40 KST** — `git-filter-repo`(pip --user) 로 4개 경로 제거, 430 커밋 재작성, 브랜치 4·태그 5 force-push(보호 규칙 일시 해제 후 원복: force_push=false·strict·check,e2e). 로컬 clone 동기·gc 완료(옛 객체 0). 미러·백업 번들은 개인정보 포함이라 즉시 폐기. **남은 것**: ① `refs/pull/*`(GitHub 숨김 ref) 가 옛 객체를 붙들고 있어 옛 SHA(`313e809` 등) raw 가 아직 200 → **GitHub Support 티켓 #4738540 접수 완료(2026-09-08, ai4radmed 명의, 유형 "일반적인 질문 또는 기능 요청")** — 답변 오면 옛 SHA raw 404 확인 ② ai4lt 재clone(핸드오프 `2026-09-08_radsafety-pwa-이력재작성-재clone.md`) |
| C    | Vercel 과거 배포 URL 차단: Deployment Protection 켜기 또는 2026-02-04 이후 배포 삭제 (대시보드, Dr. Ben)                                                                         | 대기                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D    | 통보 판단: 개인정보처리자는 학회 → 학회 사무국과 함께 판단. 정보주체 약 440명(보호위 신고 기준 1천명 미만 가능성, 통지 의무는 별개)                                              | 대기                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 1단계 — 로그인 방식 전환 (확정)

### 목표 한 문장

**로그인 식별자에서 실제 이메일을 제거하되, `auth.users.id` 와 나머지 데이터는 그대로 두고, 미래에 이메일을 다시(동의 하에) 보관하기로 해도 로그인 코드를 손대지 않아도 되는 구조로 바꾼다.**

### 용어 구분 (이 문서 전체에 적용)

| 용어                     | 뜻                                                     | 1단계 범위                       |
| ------------------------ | ------------------------------------------------------ | -------------------------------- |
| 로그인 (auth)            | "지난번 그 사용자가 맞는가"                            | **변경**                         |
| 회원 인증 (verification) | "학회 회원·병원 소속이 맞는가" (`verification_status`) | 변경 없음 — 2단계                |
| 개인정보 최소화          | 실명·이메일 등 컬럼 삭제                               | 로그인 이메일만 — 나머지는 2단계 |

"인증 변경"이라는 표현은 쓰지 않는다. 사용자·학회에는 "로그인 방식 변경", 코드에는 `auth` / `verification` 으로 분리해 적는다.

### 설계 원칙 (되돌릴 수 없는 결정)

1. **`auth.users.id`(UUID) 는 절대 바꾸지 않는다.** `profiles`·`findings`·`archives`·`notifications`·`push_subscriptions`·`feedback` 의 외래키가 전부 여기 매달려 있다. 1단계는 이 키를 건드리지 않는 컬럼 추가·값 교체만으로 구성된다.
2. **아이디를 `auth.users.email` 컬럼에 가두지 않는다.** 아이디는 `profiles.username` 에 따로 둔다. Supabase 가 이메일 자리를 요구하므로 `username@radsafety.invalid` 형태의 **가짜 이메일을 파생값으로만** 넣는다(`.invalid` 는 RFC 2606 예약 도메인 — 실제 존재 불가, 메일 발송 불가). 미래에 실제 이메일을 보관하기로 하면 `auth.users.email` 만 교체하면 되고 로그인 코드는 그대로다.
3. **더하기 → 전환 기간 → 빼기.** 3단계 "빼기" 전까지는 언제든 중단·복귀 가능하다. `rebuild_all_tables.sql` 전체 재실행이 아니라 `sql_query/migrate_*.sql` 단위로 간다.
4. **로그인 경로는 둘, 합류점은 하나.** 카카오 sub 와 아이디/비밀번호 어느 문으로 들어와도 `auth.users.id` 하나로 수렴한다. 앱의 나머지 코드는 어느 문인지 몰라도 된다.
5. **패스키(WebAuthn) 는 1단계에 넣지 않는다.** 같은 `user_id` 에 자격증명을 하나 더 다는 구조이므로 나중에 얹을 수 있다. 1단계는 이전 비용 최소화가 우선이다.

### 최종 데이터 형태 (1단계 완료 시)

```
auth.users:  id=UUID   email=<username>@radsafety.invalid   (카카오 사용자는 카카오가 준 값 대신 sub 기반 가짜 이메일)
profiles:    id=UUID   username=<사용자가 정한 아이디>   login_email=NULL   nickname=NULL
```

- `profiles.username` : `text UNIQUE NOT NULL` (전환 기간 중에는 NULL 허용, 3단계에서 NOT NULL 로 조임). 영문 소문자·숫자·`_`·`-`, 3~20자, 대소문자 구분 없음.
- `profiles.login_email`, `profiles.nickname` : 1단계에서 값을 비운다(컬럼 삭제는 2단계).
- 카카오 로그인: Supabase Kakao provider 의 동의 항목을 **최소**로 줄여 이메일·닉네임을 받지 않는다. `profiles` 로 복사하는 코드를 제거한다.
- **`username` 은 로그인 방식과 무관하게 모든 사용자가 하나씩 갖는 "이름표"다(확정, 2026-09-08).** 카카오 사용자도 첫 로그인 직후 아이디를 정한다. 카카오 닉네임을 더 이상 받지 않으므로 작성자 표시(`findings`·`archives`·의견 등)는 전부 `username` 으로 한다. 카카오 사용자의 **비밀번호는 선택** — 정하면 카카오 없이도 들어올 수 있는 두 번째 로그인 문이 생기고, 정하지 않으면 카카오 전용 계정이다(허용). `username` 을 정하기 전까지는 작성·등록 기능을 막고 이름표 설정 화면으로 보낸다.

### 로그인 흐름

```
[아이디/비밀번호]
  사용자 입력: username, password
  서버(action): profiles 에서 username → id 조회 → auth.users.email 조회
             → supabase.auth.signInWithPassword({ email: <그 이메일>, password })
  → 세션 쿠키 (기존 auth-handler.ts 경로 그대로)

[카카오]
  기존 OAuth 흐름 그대로. 콜백에서 nickname/email 복사만 제거.
  첫 로그인이면 → username 설정 화면(필수) → 비밀번호 설정(선택, 건너뛰기 가능)
  password 를 정한 카카오 사용자는 이후 [아이디/비밀번호] 경로로도 로그인 가능 (같은 auth.users.id)
```

서버가 이메일을 찾아 넘기므로, 가짜든 진짜든 클라이언트는 이메일을 모른다. 이 한 줄이 원칙 2 를 실현한다.

### 마이그레이션 3단계

| 단계                                                          | DB                                                                             | 코드                                                                                                                                                                                                   | 기존 로그인            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **A. 더하기**                                                 | `migrate_add_username.sql`: `profiles.username` 추가(NULL 허용, UNIQUE)        | 아이디/비밀번호 가입·로그인 추가. 로그인 화면에 두 방식 병존. 카카오 nickname/email 복사 제거                                                                                                          | 그대로 작동            |
| **B. 전환 기간** (**1개월**, 확정 2026-09-08 — A 배포일 기준) | 없음                                                                           | 이메일 OTP 로 로그인한 사용자에게 "아이디·비밀번호를 정해 주세요" 1회 화면. 정하면 `username` 저장 + `auth.users.email` 을 가짜 이메일로 교체 + `login_email`/`nickname` NULL. 로그인 화면에 전환 안내 | 그대로 작동 (미전환자) |
| **C. 빼기**                                                   | `migrate_finalize_username.sql`: `username NOT NULL`, 미전환 사용자 처리(아래) | 이메일 OTP 로그인 UI·`EmailOtpForm.astro`·`auth/confirm.ts` 제거. Resend 는 알림 메일 용도로만 잔존                                                                                                    | **끝**                 |

C 단계 직전에 DB 백업 1회(개인정보 포함 — 보관 기간·파기일 명시). C 가 유일한 비가역 지점이다.

**미전환 사용자 처리(C 단계)**: `username` 이 NULL 인 사용자는 이메일을 가짜 값(`u_<uuid앞8자>@radsafety.invalid`)으로 덮어쓰고 로그인 불가 상태로 둔다. 재가입 시 새 `auth.users.id` 가 생기므로 옛 글은 `user_id` 가 끊긴 채 남는다(`findings.user_id ON DELETE SET NULL` 과 같은 결과). 전환율을 높이기 위해 B 단계 중 푸시 알림·로그인 화면 배너로 2회 이상 안내한다(A 배포 직후 1회, C 1주 전 1회).

### 범위 밖 (1단계에서 하지 않음)

- 회원 인증 폐지, `allowed_members`·`verification_requests`·`email_verification_codes` 삭제, `real_name`·`society_email`·`affiliation`·`department` 등 컬럼 삭제 → **2단계**
- 근무지(180 회원기관 드롭다운) 입력 → 2단계
- 제도 개선 제안 채널(익명 기본 / 아이디 선택) → 3단계
- Gemini 연동·예산 가드레일 → 4단계
- 패스키 → 별도 단계
- 접속 통계 → **U 트랙**(사용성 모니터링) 으로 대체. 1단계 A 와 같은 배포에 실림

### 영향 파일 (1:1 명세 동반)

| 구현                                                                                                               | 명세                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `src/pages/login.astro`                                                                                            | `.spec/src/pages/login.md`      |
| `src/components/auth/EmailOtpForm.astro` (C 에서 삭제)                                                             | 해당 명세                       |
| `src/components/auth/UsernamePasswordForm.astro` (신규)                                                            | 신규 명세                       |
| `src/actions/index.ts` — `signUpWithUsername`, `signInWithUsername`, `claimUsername`(전환용)                       | `.spec/src/actions/index.md`    |
| `src/lib/auth-handler.ts`                                                                                          | `.spec/src/lib/auth-handler.md` |
| `src/store/user.ts` — `nickname`/`login_email` 의존 제거                                                           | `.spec/src/store/user.md`       |
| `src/pages/mypage.astro` — 아이디 표시, 전환 화면                                                                  | `.spec/src/pages/mypage.md`     |
| `sql_query/migrate_add_username.sql`, `migrate_finalize_username.sql`                                              | `.spec/sql_query/*.md`          |
| `documents/database_schema.md` — `profiles.username` 추가, `login_email`/`nickname` 폐기 예고                      | —                               |
| `tests/unit/actions/*.test.ts`, `tests/e2e/rls-policies.spec.ts`, `tests/e2e/monthly-check.spec.ts`(OTP 경로 제거) | `.spec/tests/**`                |

### 마이페이지 — 1단계 몫 (확정 2026-09-08)

- 상단 카드: 로그인 배지(카카오 / **아이디** — "이메일 로그인" 배지를 대체, 카카오 사용자가 비밀번호를 정해도 카카오 배지 우선) · ADMIN 배지 · **`username`** (실명·이메일 표시 제거) · 가입일. 구성은 현행 유지.
- 2단계 몫(카드 구성 변경·컬럼 삭제)은 2-2 참조.

`PUBLIC_ADMIN_EMAILS` 로 관리자를 식별하는 현재 방식은 이메일이 사라지면 깨진다 → 1단계 A 에서 `profiles.is_admin` 단일 기준으로 바꾼다(컬럼은 이미 있음).

### 완료 기준

- [ ] 신규 사용자가 아이디/비밀번호만으로 가입·로그인·로그아웃 가능
- [ ] 카카오 로그인 후 `profiles` 에 nickname·email 이 기록되지 않음
- [ ] 카카오 첫 로그인 시 `username` 설정 화면이 뜨고, 설정 전에는 작성·등록이 막힘
- [ ] 카카오 사용자가 비밀번호를 정하면 아이디/비밀번호로도 같은 계정에 로그인됨
- [ ] 기존 이메일 사용자가 전환 화면을 거친 뒤 `auth.users.email` 이 `@radsafety.invalid` 이고 옛 글·알림·푸시 구독이 그대로 보임
- [ ] `rls-policies.spec.ts` 통과 (정책 무변경 확인)
- [ ] `GET /api/health?deep=1` 정상
- [ ] `documents/database_schema.md`·`external_services_guide.md`(Kakao 동의 항목 최소화) 갱신
- [ ] 개인정보처리방침 초안에 "로그인 이메일 미보관", "카카오는 이용 사실을 알게 됨" 반영

### 예상 공수

- A: 반나절 · B(전환 화면·안내): 반나절 · C: 2~3시간 + 백업. 합계 1.5일. 실기기 확인(iOS PWA·Android·PC) 은 Dr. Ben 몫 반나절.

---

## 2단계 — 회원 인증 폐지 및 개인정보 컬럼 삭제 (확정 2026-09-08)

정회원 인증 계층을 없애고 `allowed_members`·`verification_requests`·`email_verification_codes` 와 `profiles` 의 실명·학회 이메일·소속 컬럼을 삭제한다. `verification_status` 를 보는 RLS·페이지 게이트를 **같은 마이그레이션에서** 걷어낸다. `findings` 가 카카오 계정만 있으면 보이는 콘텐츠가 된다는 정책 결정을 전제로 한다. 근무지는 180 회원기관 드롭다운으로 받아 `hospital_id` 로 저장하고 집계 화면만 둔다.

### 2-1. 업로드 권한 — 첫 1회 검토, 이후 직접 게시 (확정 2026-09-08)

`verification_status` 가 하던 "누가 올릴 수 있는가" 역할을 **신원이 아닌 실적**으로 대체한다. 관리자 비용은 사용자당 1회로 끝나고, 새로 만든 계정은 구조적으로 첫 관문을 못 넘으며, 차단된 사용자가 재가입해도 다시 첫 관문부터라 피해가 1건으로 제한된다.

**규칙**

1. 로그인 사용자는 누구나 자료실·지적사례를 **제출**할 수 있다. `can_publish=false` 인 사용자의 제출은 `status='pending'`(미공개) 으로 강제된다.
2. 관리자가 승인하면 `status='published'` 가 되고 **작성자의 `can_publish` 가 `true` 로 바뀐다.** 이후 그 사용자의 제출은 즉시 `published`.
3. `can_publish` 는 **영구가 아니다.** 관리자가 언제든 회수할 수 있고, 회수되면 다시 1번으로 돌아간다. 게시된 자료의 사후 삭제·비공개는 현행대로.
4. 반려 시 `can_publish` 유지(false), 사유를 `notifications` 로 전달, `reject_count += 1`. **반려 3회 누적 → 제출 차단.** 승인·반려 모두 제출자에게 알림 1건.
5. `can_publish` 는 자료실·지적사례 **공통 플래그 하나**다. 콘텐츠 종류별로 나누지 않는다.
6. 첫 제출(pending 생성) 시 관리자에게 텔레그램 1통(`health.yml` 보고 경로 재사용). 검토 지연을 막기 위한 장치이며 on/off 가능.

**"미공개" 는 파일도 미공개여야 한다.** 현행 자료실은 공개 버킷이라 DB 행이 pending 이어도 URL 을 알면 파일이 받아진다. pending 파일은 **비공개 버킷(또는 서명 URL)** 에 두고, 승인 시에만 공개 경로로 옮긴다. 이 항목이 2-1 구현에서 가장 손이 가는 부분이다.

**파일 규칙(동반)**: 크기 상한 20MB · 형식 허용목록(pdf·hwp·hwpx·docx·xlsx·이미지) · 실행파일 및 매크로 문서(`.docm`·`.xlsm`) 차단 · 파일명 정규화 · 제출 화면에 "저작권·개인정보 없음 확인" 체크박스 1개.

**데이터·정책 형태**

```
profiles.can_publish      boolean not null default false   ← verification_status 의 업로드 역할 대체
profiles.reject_count     int     not null default 0
archives.status           text    not null default 'pending'  check in ('pending','published')
findings.status           text    not null default 'pending'  check in ('pending','published')

RLS
  insert  : 로그인 사용자 누구나. can_publish=false 이면 status='pending' 강제(트리거 또는 check)
  select  : published 는 전원 / pending 은 작성자 본인 + 관리자
  update  : 관리자 — 승인(published + 작성자 can_publish=true) · 반려(reject_count+1) · 회수(can_publish=false)
storage
  pending 파일 → 비공개 버킷 / published → 현행 공개 경로
```

**영향 파일**: `src/pages/resources.astro`·`findings-recommendations.astro` 의 `canUpload` 조건(현재 `verification_status` 검사) → 로그인 여부로 교체하고 pending 안내 추가 · `src/pages/admin/` 에 승인 대기열 화면 신설(`admin/feedback.astro` 패턴) · RLS `"Verified users can create archives"` 교체 · `documents/database_schema.md` 갱신.

**기존 사용자 이전**: 2단계 마이그레이션 시점에 `verification_status in ('list','temp_verified','verified')` 였던 사용자는 `can_publish=true` 로 옮긴다(이미 검토를 거친 것으로 간주). 기존 `archives`·`findings` 행은 전부 `published`.

### 2-2. 마이페이지 카드 구성 및 삭제 컬럼 (확정 2026-09-08)

**카드 1(상단)**: 1단계에서 확정한 형태 그대로(배지·`username`·가입일).

**카드 2 — "업로드 권한 및 소속"**

| 항목        | 표시                                                           | 비고                                            |
| ----------- | -------------------------------------------------------------- | ----------------------------------------------- |
| 업로드 권한 | `직접 게시 가능` / `첫 제출 검토 대기` / `제출 차단(반려 3회)` | `can_publish`·`reject_count` 로 판정            |
| 기관        | 180 회원기관 드롭다운 값                                       | 필수 아님, `hospital_id`                        |
| 소속학회    | 대한핵의학회 / 대한핵의학기술학회 / 비소속                     | **선택 항목**, 자기 신고, `society` 컬럼 재사용 |

- `(재)인증요청` 버튼, 인증 요청 섹션(학회 선택·실명·메일 입력), 페이지 하단 "회원 인증" 모달 — **전부 삭제**.
- 기관·소속학회는 **본인 마이페이지와 관리자 화면에서만** 보인다. 작성자 표시·자료 목록·익명 제보 어디에도 붙이지 않는다. 소속학회 유지 근거: 값이 2~3개뿐인 굵은 분류라 단독 식별 불가, 기관과 결합해도 기관 단독 대비 추가 위험이 작음.

**카드 3(안전관리면허·방안관리자 선임) — 삭제.** `license_type`·`is_safety_manager`·`safety_manager_start_year`·`safety_manager_end_year` 는 마이페이지와 `store/user.ts` 외 어디서도 쓰이지 않음(체크리스트·수검준비 개인화 미사용, 2026-09-08 grep 확인). 카드와 컬럼을 함께 삭제한다.

**2단계에서 삭제하는 `profiles` 컬럼(확정)**: `login_email`, `nickname`, `society_email`, `real_name`, `affiliation`, `department`, `verification_status`, `verification_date`, `verification_method`, `email_verified`, `classification`, `license_type`, `is_safety_manager`, `safety_manager_start_year`, `safety_manager_end_year`.
**유지**: `id`, `username`, `created_at`, `is_admin`, `society`(선택), `hospital_id`(신규), `can_publish`(신규), `reject_count`(신규).

**동반 변경**: `src/pages/admin/members.astro` 가 학회·실명·이메일을 표시 중 → `username`·기관·소속학회·업로드 권한·반려 횟수 표로 교체. `src/lib/admin/verification-controller.ts`·`admin/verification-requests.astro` 는 삭제.

### 2-3. 회원기관 목록 — 앱 설정 파일 + 추가 요청 (확정 2026-09-08)

- 목록은 DB 테이블이 아니라 **앱 설정 파일**로 제공한다: `src/data/hospitals.ts` (`src/data/resources.ts` 와 같은 자리). 항목은 `{ id, name, region? }`. 변경은 코드 수정 → PR → 배포(변경 빈도가 낮아 배포 비용이 문제되지 않고, 이력이 git 에 남는다).
- **`id` 는 slug 규칙을 따른다** (`documents/resource_slugs.md` 와 동일 원칙): 영문 소문자·숫자·하이픈, 한 번 정하면 변경 금지. `profiles.hospital_id` 가 이 값을 저장하므로 이름이 바뀌어도(병원 개명·합병) `id` 는 유지하고 `name` 만 고친다. 폐업·통합 시 항목을 지우지 않고 `retired: true` 로 표시한다(기존 회원의 `hospital_id` 가 끊기지 않도록).
- 초기 목록 출처: 대한핵의학회 회원기관 180개. 학회 홈페이지 공개 명단 기준으로 작성하고, 개인 명부(0단계 유출 파일)는 **출처로 쓰지 않는다**.
- **없는 기관은 사용자가 관리자에게 추가 요청**한다. 마이페이지 기관 드롭다운 하단 "내 기관이 없어요" → 기존 `feedback` 흐름 재사용(카테고리 `기관 추가 요청`, 입력은 기관명 하나). 관리자가 파일에 추가·배포한 뒤 요청자에게 `notifications` 로 안내하면 사용자가 다시 선택한다. 요청에는 기관명 외 어떤 정보도 받지 않는다.
- "미가입 병원 추정" 집계는 `hospitals.ts` 전체 − `profiles.hospital_id` distinct 로 계산한다(관리자 대시보드).
- 회원기관이 아닌 곳(비회원 병원·연구기관 등)은 목록에 넣지 않는다. 그 사용자를 위해 **`{ id: 'other', name: '기타' }` 한 항목**을 둔다(확정 2026-09-08). `기타` 는 "미가입 병원 추정" 집계에서 제외하고, 기관 추가 요청의 대상도 아니다(회원기관만 추가).

## 3단계 — 제도 개선 제안 채널 (확정 2026-09-08)

### 목적과 위치

KINS 가 요청한 "익명으로 의견을 낼 수 있는 채널". 기존 **의견보내기(`feedback`) 는 앱 오류·사용성 채널로 그대로 두고**, 방사선안전관리 **제도 개선 제안**은 별도 기능 `proposals` 로 만든다. 제안은 제출 시 **익명 / 아이디** 를 선택하며 **기본값은 익명**이다.

| 채널                             | 대상                | 발신        | 테이블                 |
| -------------------------------- | ------------------- | ----------- | ---------------------- |
| 의견보내기 (기존)                | 앱 오류·사용성      | 항상 아이디 | `feedback` (현행 유지) |
| 제도 개선 제안 — 익명 (**기본**) | 방사선안전관리 제도 | 익명        | `proposals`            |
| 제도 개선 제안 — 아이디          | 〃                  | 아이디      | `proposals`            |

원칙: **문은 로그인으로 지키고, 글에는 문을 지나간 흔적을 남기지 않는다.** 로그인 사용자만 제출할 수 있지만, 익명 모드에서는 서버가 신원을 확인한 뒤 버린다.

### 데이터 — 한 테이블, 두 모드

```
proposals
  id            uuid
  category      text            -- 안전관리 / 피폭 / 규제 / 기타
  body          text
  status        text            -- new / reviewing / answered / closed
  admin_note    text
  admin_reply   text
  mode          text            -- 'anonymous' | 'signed'
  author_id     uuid  NULL      -- signed 일 때만. anonymous 는 반드시 NULL
  created_at    timestamptz NULL-- signed 일 때만(초 단위). anonymous 는 반드시 NULL
  created_day   date            -- 두 모드 공통. anonymous 의 유일한 시간 정보
  receipt_hash  text  NULL      -- anonymous 일 때만. 접수증 코드의 해시

proposal_quota
  key    text primary key       -- anonymous: HMAC(user_id + 오늘날짜, 서버 비밀키) / signed: user_id + 오늘날짜
  count  int
```

**없는 컬럼이 설계다**: `ip`, `user_agent`, `hospital_id`. 익명 행에 신원 컬럼이 NULL 로 비어 있는 것은 컬럼이 없는 것과 "기록하지 않았다" 는 점에서 같고, 서버 액션 한 곳만 보면 검증된다.

### 제출 흐름 — RLS 가 아니라 서버 액션이 문지기

```
브라우저 → src/actions (submitProposal)
  ① 세션 확인: 로그인 사용자인가                    ← 신원을 보는 마지막 지점
  ② 쿼터 확인: proposal_quota.count < 3 (1인·1일)   + 전체 일일 상한 100건
  ③ 서비스 롤로 proposals insert
       anonymous → author_id·created_at 비움, receipt_hash 저장
       signed    → author_id·created_at 기록
  ④ anonymous → 접수증 코드 반환(1회만 표시) / signed → 마이페이지 목록 안내
```

- RLS: `proposals` 에 anon/authenticated 의 **insert 전면 금지**(쓰기는 서비스 롤 경로 하나뿐 — 클라이언트가 `mode` 를 속여 `author_id` 를 넣거나 빼는 것을 막는다). `select` 는 `author_id = auth.uid()`(본인 signed 건) 또는 `is_admin`. anonymous 행은 `author_id` 가 NULL 이라 본인 정책에 걸리지 않고 관리자만 본다.
- `proposals` 에는 quota `key` 를 **저장하지 않는다.** 어느 제안이 어느 key 였는지는 서버도 모른다. quota 행은 다음 날 삭제.
- 토큰 발급 방식(로그인 시 제안권 N장) 이 더 강하지만 구현이 배로 든다. 1차는 HMAC 방식 — "제안↔사용자 연결 불가" 는 같고, 관리자가 알 수 있는 것은 "어떤 사용자가 오늘 몇 건 냈다" 까지다.

### 모드별 차이

|           | anonymous (기본)                           | signed                         |
| --------- | ------------------------------------------ | ------------------------------ |
| 답변 전달 | 접수증 코드로 조회 화면에서 확인           | `notifications` 로 본인에게    |
| 본인 목록 | 없음(코드 분실 시 확인 불가 — 화면에 명시) | 마이페이지 "내 제안" 목록·상태 |
| 철회      | 불가                                       | 답변 전 철회 가능              |
| 쿼터 키   | HMAC(user_id, day)                         | user_id, day                   |

접수증 코드: 제출 완료 화면에 1회만 표시(예: `RS-7K3M-Q9XA`), DB 에는 해시만. "제안 조회" 화면에서 코드 입력 → 상태·`admin_reply` 열람. 관리자는 누구에게 답하는지 모른 채 답한다.

### 첨부 — 두 모드 공통

- 비공개 버킷 `proposal-attachments`. 경로 `<uuid>/<uuid>.<ext>` — 현행 `feedback-attachments` 처럼 `user_id` 를 경로에 넣지 않는다.
- 서버에서 **메타데이터 제거 후 저장**: 이미지는 `sharp` 재인코딩(EXIF·위치 소멸), PDF 는 `pdf-lib` 로 작성자·생성도구 필드 삭제. hwp·docx 는 메타 제거가 번거로워 **1차는 이미지·PDF 만 허용**. 원본 파일명은 버린다.
- signed 라도 적용한다 — 익명이 아니어도 병원 정보가 EXIF 로 새는 것은 막아야 한다.
- 크기 10MB, 건당 3개.

### 관리자 화면 — `admin/proposals.astro`

목록·상태·메모·답변·삭제. `admin/feedback.astro` 패턴, 단 anonymous 행에는 "작성자" 열이 비어 있다. 공개할 가치가 있는 제안은 관리자가 **특정 정보를 지운 뒤 지적사례(`findings`) 로 옮겨 적는 수동 단계**를 둔다 — KINS 가 원한 "익명 의견이 공적 사례로 축적되는" 경로. 자동 이관은 두지 않는다. KINS 보고용 집계("제안 N건 중 익명 M건") 는 이 테이블 하나로 낸다.

### 로그·외부 서비스에서 흔적 끊기

- `src/lib/logger.ts` 가 `submitProposal` 에서는 본문·사용자·요청 메타를 남기지 않도록 예외 처리. Vercel 함수 로그는 보관이 짧지만(무료 1시간·Pro 1일) 우리 구조화 로그는 영구라 여기가 핵심.
- **Gemini 처리 대상에서 제외.** 원문은 관리자가 읽고 필요할 때만 수동으로 넘긴다(4단계 가드레일과 무관하게 고정).
- 텔레그램 알림은 "새 제안 1건(익명/아이디)" 만. 본문 미포함.

### 제출 화면 문구 (법적 방어선)

- 익명 모드: "관리자도 작성자를 알 수 없습니다. 접수증 코드를 잃으면 답변을 확인할 수 없습니다."
- 아이디 모드: "관리자가 답변을 알림으로 보내드립니다. 제안 목록은 마이페이지에서 볼 수 있습니다."
- 공통: "특정될 수 있는 정보(병원명·장비 대수·날짜) 는 적지 마십시오." / "허위 사실·특정인 비방은 명예훼손에 해당할 수 있습니다."

### 남는 한계 (처리방침에 정직하게 적을 것)

- 관리자는 `proposal_quota` 의 key 를 계산하면 "누가 오늘 제안했다" 까지는 알 수 있다(어느 글인지는 모름).
- Vercel·Supabase 로그의 초 단위 요청 시각과 로그인 시각을 보관 기간 안에 맞춰 보면 추정이 가능하다. `created_day` 와 로그 예외 처리로 창을 줄이는 것까지가 한계.
- 글 내용 자체가 드러내는 신원은 기술로 막을 수 없다.
- 따라서 처리방침 문구는 "운영자도 알 수 없다" 가 아니라 **"운영자는 익명 제안의 작성자 정보를 기록하지 않으며 제안과 계정을 연결하지 않는다"** 로 쓴다.

### 선행 조건·공수

2단계(인증 폐지) 이후 착수 — "로그인 = 카카오/아이디 계정" 전제가 서야 한다. 테이블·액션·쿼터 반나절, 첨부 메타 제거 반나절, 제출·조회·마이페이지 목록·관리자 화면 1일, 명세·테스트 반나절 — **약 2.5일**.

## KINS 연계 트랙 (확정 2026-09-08) — 1~3단계와 독립, 병행 가능

2026-07-02 KINS–KSNM 업무협의(박병현 실장)에서 나온 권고 4건의 구현. 로그인·인증 개편과 무관하게 현행 구조 위에 얹을 수 있으므로 **1단계보다 먼저 내놓는 것도 가능**하다. vault 정본: `knowledge/01_projects/2026-01_RadSafety-pwa/2026-07-02_KINS_박병현실장면담_RadSafety연계권고.md`.

### K-1. 사건사고 전파 (`bulletins`) — 권고 3·4번

**소스 결정 (2026-09-08 실측 후 확정)**: 세 후보를 직접 열어 비교한 결과 **NSIC(사례집, 본체) + 원안위 보도자료(속보, 보조)**. RASIS 는 제외.

|        | NSIC 방사선사고                                                                          | RASIS 보고사건조회                                        | 원안위 보도자료                                 |
| ------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| URL    | `nsic.nssc.go.kr/information/reguDataActive.do?nsicDtaTyCode=nppAccient` (방사선사고 탭) | `rasis.kins.re.kr` 보고사건조회                           | `nssc.go.kr/ko/cms/FR_CON/index.do?MENU_ID=190` |
| 정당성 | 정보공개센터. `robots.txt` 차단 없음, CSV/Excel 내보내기 제공                            | **`robots.txt` 전면 차단** → 허락 없이 연동 불가          | 공개 게시판, 공공누리 표시                      |
| 내용   | 사건 개요·**원인**·보고 요약·**사고등급**·유형·지역·마스킹 기관명                        | 요약                                                      | 제목+첨부 PDF                                   |
| 마스킹 | 깨끗함                                                                                   | `inciReptNo` 에 실명, `inciOccrDetlAddr` 에 상세주소 노출 | 해당 없음                                       |
| 양     | 60건(2004~), 의료 11건. 연 6~10건                                                        | 475건(2022~), 의료 7건. 연 100건                          | 월 12건, 의료·RI 월 1~2건                       |
| 속도   | 느림 — 등급 평가 후 게재(수개월)                                                         | 보고 즉시                                                 | 보도 시점                                       |
| 관계   | RASIS 의 공개용 정제본. 사건 ID(`EXMN…`) 동일                                            | 원천                                                      | 사건 정보의 원천은 RASIS 보고                   |

근거: 회원에게 필요한 것은 "공장 분실 100건" 이 아니라 "병원 사례의 원인과 조치" 다. NSIC 의 유일한 약점(느림)은 원안위 보도자료의 "조사 착수" 속보가 메우고, 같은 사건이 보도자료 → (수개월 후) NSIC 원인·등급 순으로 오므로 둘은 정확히 보완적이다. RASIS 의 즉시성·전수는 허락·마스킹 문제를 감수할 만큼 크지 않다.

**파이프라인**

```
[GitHub Actions cron]                                   ← health.yml 패턴. Vercel 이 아닌 이유: 앱 사망 시에도 수집·알림 생존
  scripts/bulletin-poll.mjs
    NSIC 어댑터 (하루 1회)
      목록: POST /information/ajaxRadAccidentList.do  (currPage, listNum) → HTML 조각 파싱 → EXMN id
      상세: POST /ajaxRadAccidentListPop.do (seq=EXMN…) → JSON (inciMainCntn 개요·inciCausCntn 원인·inciSummCntn 요약·inciGrdCdNm 등급)
      최초 1회 60건 백필 → "사건 사례집" 이 첫날부터 채워진 상태로 시작
    NSSC 어댑터 (평일 1시간 간격)
      목록: POST /ajaxf/FR_BBS_SVC/BBSViewList.do  (siteId=www, lang=ko, MENU_ID=190, SITE_NO=2, BOARD_SEQ=5, pageNo, pagePerCnt)
      → BBS_SEQ·SUBJECT·WRITE_DATE·DEPT_NM·FILE_CNT·PUBLIC_NURI_GBN
    공통: external_id 없는 것만 insert(status='pending') → relevant 판정 → relevant 건 있으면 텔레그램 1통(제목+관리자 링크)
          3회 연속 실패 시에만 장애 알림 (NSSC 사이트는 간헐적 "서버장애" 페이지를 냄 — 실패에 관대할 것)

[관리자 admin/bulletins.astro]
  pending 목록 → 한 줄 요약·"정기검사 준비 포인트"·관련 체크리스트 항목 입력 → [게시]
  게시 = status='published' + 전 회원 notifications + 웹푸시 (createBulkNotifications·sendPushToUsers 재사용)
  비관련 건도 목록에 남아 있어 필터가 놓친 건을 건져 올릴 수 있음

[사용자 bulletins.astro]
  기본 필터 "의료" / 전체 토글. 제목·등급·유형·지역·기관(마스킹)·원문 링크·첨부 링크·관리자 요약·준비 포인트
  홈 상단 배너에 최신 1건. 오프라인 캐시 대상
```

**relevant 판정**

- NSIC: 기관명에 `병원|의료원|의원` 또는 사고명에 `치료용|진료용|방사성의약품|환자|핵의학`
- NSSC: `DEPT_NM ∈ {방사선안전과, 방사성폐기물안전과}` 또는 제목에 `병원|의료|핵의학|동위원소|RI`. 키워드만 쓰면 원전 정지·후쿠시마 브리핑이 대거 섞이므로(실측 32건 히트 중 의료 6건) **부서 필터가 주**다.

**사람 승인을 끼우는 이유**: 의료 건이 연 10건 미만이라 검토 비용이 거의 없고, KINS 가 원한 것은 재전송이 아니라 "정기검사 준비에 도움" 이다. 관리자가 "이 사건이 우리 체크리스트 어디에 해당하는가" 한 줄을 붙이는 것이 이 기능의 가치. 승인 없이 자동 게시하는 토글은 나중에 켤 수 있게만 둔다.

**데이터**

```
bulletins
  id              uuid
  source          'nsic' | 'nssc'
  external_id     text UNIQUE      -- NSIC: EXMN…  / NSSC: BBS_SEQ
  title           text
  occurred_at     date             -- NSIC 사고일자 / NSSC 등록일
  incident_type   text NULL        -- 분실·화재·피폭·방출·기기고장·오염 (NSIC)
  incident_grade  text NULL        -- 0~3등급·미대상 (NSIC)
  region          text NULL        -- 시도 (NSIC)
  org_masked      text NULL        -- 'OO대학교병원' 그대로. 실명·주소 필드는 어댑터에서 버린다
  source_url      text
  attachment_urls text[]           -- NSSC 첨부 (링크만, 파일 미복제)
  summary         text             -- NSIC: 개요+원인 / NSSC: 관리자 작성
  prep_note       text             -- 관리자 "정기검사 준비 포인트"
  checklist_refs  text[]           -- 관련 체크리스트 항목 slug
  relevant        boolean
  status          'pending' | 'published' | 'ignored'
  published_at    timestamptz
```

저장 원칙: **본문 전문은 재게시하지 않고 링크**한다. NSSC 공공누리 코드(`N0104`/`N0105`) 는 유형 확인 후 전문 게시 여부를 정하되, 링크+요약은 어느 유형이든 안전. NSIC 상세는 공개 목적 데이터이므로 개요·원인 요약을 저장하되 출처(원안위 정보공개센터) 를 화면에 표시한다.

**KINS 통보**: 연동 시작 전 박병현 실장께 메일 1통 — ① NSIC·NSSC 를 이렇게 연계한다는 통보, ② RASIS 보고사건조회 응답의 마스킹 누락(`inciReptNo` 실명·`inciOccrDetlAddr`) 알림. draft-only(발송은 Dr. Ben).

**공수**: 어댑터 2개·테이블·폴러·워크플로 1일, 관리자·사용자 화면 1일, 명세·테스트 반나절 — **약 2.5일**.

### K-2. KINS 공식 자원 링크 — 권고 1·2번

`src/data/resources.ts` 에 두 항목 추가: **방사선규제해석 SOS**, **이용자지원간행물**. 정확한 URL·인용 범위는 vault 노트 후속 행동대로 KINS 확인 후 기입. 공수 1시간. K-1 통보 메일에 함께 문의한다.

---

## U 트랙 — 사용성 모니터링 (확정 2026-09-08) — 1단계 A 와 함께 배포

### 목적

어떤 기능이 얼마나 쓰이는지(feature adoption)·활성 사용자 수(DAU/WAU/MAU)·전환 기간 퍼널(가입 → 아이디 설정)을 **개인을 추적하지 않고** 잰다. 1단계 C 시점을 정하는 근거가 되므로 1단계 A 와 같은 배포에 실린다. 앞서 검토했던 임시 `login_events` 는 이 트랙으로 대체.

### 채택하지 않는 것

- GA4·PostHog·Umami·Plausible 등 **제3자 분석 도구** — 쿠키·IP·해외 전송, 외부 의존 추가. 규모(수백 명) 상 강점이 필요 없음.
- **세션 리플레이·히트맵** — 화면 녹화. 개인정보 방침과 정면 충돌.
- **리텐션·코호트** — 같은 사람을 기간을 넘어 이어야 하므로 원리적으로 포기(아래 `actor_key` 설계의 의도된 결과).

보조: Web Vitals 만 Vercel Speed Insights 로 (성능·오류 신호, 개인 데이터 없음).

### 설계 — 자체 수집, 날짜별 HMAC

```
usage_events (원시, 90일 후 삭제)
  event      text         -- 허용목록에 있는 이름만
  page       text
  props      jsonb        -- 허용된 키만 (slug·카테고리). 자유 텍스트·검색어 원문 ✗
  hour       timestamptz  -- 시 단위로 뭉갬
  actor_key  text NULL    -- HMAC(user_id + 오늘날짜, 서버 비밀키). 비로그인은 NULL
  week_key   text NULL    -- HMAC(user_id + ISO주, …)  → WAU
  month_key  text NULL    -- HMAC(user_id + 년월, …)   → MAU

usage_daily (집계, 영구)
  day, event, count, unique_actors
```

- `actor_key` 는 날이 바뀌면 다시 계산할 수 없다 → DAU 는 정확, 개인의 시계열은 불가. `week_key`·`month_key` 로 WAU·MAU 까지만 잇고 그 이상은 잇지 않는다.
- **`proposals`(제도 개선 제안) 화면·액션은 추적 대상에서 제외.** 익명 제출 직전 페이지뷰가 남으면 3단계에서 끊은 연결이 여기서 다시 생긴다. `src/lib/logger.ts` 예외와 같은 위치에서 같이 관리.
- 서버 `/api/track` 이 이벤트 이름·props 키를 **허용목록으로 검증**하고 나머지는 버린다. 클라이언트가 무엇을 보내든 스키마 밖은 저장되지 않는다.
- PWA 오프라인: 클라이언트(`src/lib/track.ts`) 가 IndexedDB 에 쌓았다가 온라인 시 `sendBeacon` 으로 묶어 전송. 오프라인 사용 자체가 이 앱의 핵심 지표.
- 야간 롤업(GitHub Actions cron 또는 Supabase pg_cron): `usage_events` → `usage_daily`, 90일 지난 원시 행 삭제.

### 초기 이벤트 허용목록 (10개 남짓)

`signup`, `username_set`, `login`(props: method=kakao|password), `checklist_open`, `checklist_item_check`, `finding_view`, `finding_search`(검색어 원문 ✗, 횟수만), `resource_view`, `resource_download`(props: slug), `glossary_lookup`, `notification_open`, `pwa_installed`, `push_granted`, `offline_visit`, `client_error`(props: 메시지 해시·페이지).

### 관리자 화면 `admin/usage.astro`

- 오늘 / 7일 / 30일 활성 사용자
- 기능별 30일 추세
- PWA 설치율 · 푸시 허용률
- **전환 기간 퍼널**: 가입 → 아이디 설정 완료율 (1단계 B 기간 동안 매일 확인, C 시점 판단 근거)
- 오프라인 접속 비율

### 법적 위치

쿠키 없음 · IP 미저장 · 개인 식별자 미저장 · 집계 외 90일 파기 → 동의 배너 불필요. 처리방침 한 문단: "서비스 개선을 위해 기능 사용 횟수를 익명 집계합니다. 개인을 식별하거나 추적하지 않습니다." 무엇을 기록하는지는 `/api/track` 의 허용목록 파일 하나를 가리키면 된다.

### 영향 파일·공수

`src/lib/track.ts`(신규) · `src/pages/api/track.ts`(신규) · `sql_query/migrate_add_usage.sql` · 각 페이지에 `track()` 호출 심기 · `admin/usage.astro`(신규) · 롤업 워크플로. 계측 반나절 · 이벤트 심기 반나절 · 화면 반나절 — **1.5일**. 명세 1:1 동반.

---

## 4단계 — 앱 내 법령 Q&A (lawbot) (보류, 구조만 확정 2026-09-08)

규모가 커서 **착수는 보류**. 1~3단계 완료 후 재개한다. 단, 재개 시 흔들리지 않도록 **구조·전략은 지금 확정**해 둔다. lawbot 설계·평가 자산의 정본은 vault `01_projects/2026-01_RadSafety-pwa/RadSafety-lawbot/`.

### 용어 정리

- **하이퍼링크**(사용자를 외부 사이트로 내보냄)와 **API 연동**(서버끼리 뒤에서 통신, 사용자는 앱 화면에 머묾)은 다르다. 4단계는 후자 = **앱 내 기능**. "앱 내" 는 화면 이야기이고, "어느 서버에서 계산하느냐" 는 별개의 배치 결정이다.
- 외부 QnA 봇(NotebookLM 공유 노트북 등)으로 **하이퍼링크**를 여는 것은 4단계와 무관하며 보류 대상이 아니다 — 비용 0, 질문이 앱을 거치지 않음. 필요하면 K-2 방식으로 `resources.ts` 에 "외부 서비스" 항목 하나로 즉시 가능(NotebookLM 은 열람자도 Google 로그인 필요, 처리방침에 외부 서비스 문구 필요).

### 질문 1건의 4단계와 비용·GPU 구간

| 단계            | 하는 일                        | 필요한 것                    | 비용/GPU                                       |
| --------------- | ------------------------------ | ---------------------------- | ---------------------------------------------- |
| ① 질문 받기     | 입력·로그인·쿼터 확인          | Vercel (현행)                | 없음                                           |
| ② 질문 임베딩   | 질문 → 벡터                    | 작은 AI 모델                 | 직접 돌리면 상주 서버(CPU 가능), API 면 소액   |
| ③ 조문 검색     | 가까운 법령 조각 조회          | Supabase pgvector + 전문검색 | 없음                                           |
| ④ 답 생성       | 조문을 읽고 답 작성            | 큰 AI 모델                   | 직접 돌리면 **GPU 필수**, API 면 **주요 비용** |
| ⓪ 코퍼스 인덱싱 | 법령 전체 → 벡터 (개정 시 1회) | ② 와 **같은 모델**           | 1회성 배치                                     |

AI 가 계산하는 구간은 ②·④ 뿐. ①·③ 은 현행 인프라로 된다. ⓪ 와 ② 는 반드시 같은 모델이어야 한다(다른 모델의 벡터는 비교 불가).

### 전략 — "입구와 검색은 우리 것으로 고정, 모델 두 슬롯은 교체 가능"

**고정(우리 자산)**

1. **입구 = Vercel `/api/lawbot` 하나.** 인증·쿼터·예산 캡·로그 예외가 여기 있고, 뒤에서 무엇을 바꾸든 PWA 는 모른다.
2. **검색층은 직접 만든다** — Supabase pgvector + 전문검색 **하이브리드** + 재순위(rerank). 법령 Q&A 정확도는 "맞는 조문을 찾았는가" 에서 대부분 결정되며, 이 층은 모델과 무관하게 남는다. 별표 파싱(radsafety-laws, 손실 0 확인) 포함.
3. **답변 형식 강제**: 조문 인용 없이는 답하지 않음 · 근거 조문 원문 링크 · 근거 없으면 "찾지 못했습니다". vault 의 할루시네이션 통제 설계가 여기 들어간다.
4. **평가셋 = 회귀 테스트.** `lawbot-평가셋.yaml` 을 CI 게이트로 — 모델·인덱스를 바꿀 때 점수가 떨어지면 배포 차단. "업그레이드 가능" 의 실체.

**교체 가능(두 슬롯)**

| 슬롯     | 결정                                                                                         | 교체 조건                                  | 교체 비용                      |
| -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------ |
| ② 임베딩 | **미결 — 아래 재비교로 결정**                                                                | 더 좋은 모델 등장                          | ⓪ 재인덱싱 1회 (자동 스크립트) |
| ④ 생성   | **API 로 현재 최상급 모델**(Gemini Pro 급·Claude Sonnet 급. 정확도 우선이므로 Flash 급 회피) | 더 좋은 모델, 또는 GPU 확보 시 자체 호스팅 | 제공자 추상화로 코드 한 줄     |

설계 규칙: 벡터마다 `model_version` 저장(새 버전 병행 → 평가 통과 → 전환) · 생성은 `generate(prompt, sources)` 인터페이스 뒤, 제공자는 환경변수로 선택.

### ② 임베딩 결정 = 별도 서버(Oracle) 유무 결정

| 임베딩 모델                                        | ⓪ 어디서                        | ② 어디서                      | 별도 서버                           |
| -------------------------------------------------- | ------------------------------- | ----------------------------- | ----------------------------------- |
| API (Gemini/Voyage 등)                             | Vercel 또는 kimbi 에서 API 호출 | Vercel 에서 API 호출          | **없음** — 전체가 Vercel + Supabase |
| `qwen3-embedding:8b` (로컬, lawbot 노트 현재 선택) | kimbi (배치)                    | **Oracle VM 상주** (CPU 가능) | **있음**                            |

`qwen3` 는 로컬 측정에서 좋았지만 **API 임베딩과 같은 평가셋으로 비교된 적이 없다.** 재개 전 선행 과제 하나: **`qwen3` vs API 임베딩을 `lawbot-평가셋.yaml` 로 재비교.** 비슷하거나 API 가 이기면 Oracle 없이 간다(운영 부담 최소). 예상은 API 우세 또는 동급.

### GPU

서빙용 GPU 는 사지 않는다. **kimbi RTX 5080** 은 ⓪ 재인덱싱·모델 비교 배치 전용(집 PC, 상시 가동 아님). 자체 호스팅이 정말 필요해지면 ④ 슬롯만 Ollama 로 교체.

### 재개 시 전제 (유지)

서버 프록시만 키 보유 · 계정별 일 예산 + 전체 월 예산 캡(④ 한 곳에만) · 초과 시 자동 차단 + 텔레그램 알림(`health.yml` 패턴) · 제도 개선 제안(`proposals`) 원문은 처리 대상에서 제외 · U 트랙에 `lawbot_query` 이벤트 추가(질문 원문 ✗).
