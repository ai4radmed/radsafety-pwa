# src/lib/usage/events.ts — 사용성 집계 허용목록

## 역할

**무엇을 기록하는지는 이 파일 하나만 보면 된다.** 처리방침이 "기능 사용 횟수를 익명 집계한다" 고 적는 근거가 여기다.

서버가 목록 밖 이벤트 이름과 속성 키를 전부 버린다. 클라이언트가 무엇을 보내든 스키마 밖은 저장되지 않는다 — U-3 에서 클라이언트 수집을 붙여도 이 관문은 그대로다.

## U-1 이벤트

| 이벤트              | 속성                       | 기록 지점                                             |
| ------------------- | -------------------------- | ----------------------------------------------------- |
| `page_view`         | 없음                       | `src/middleware.ts`                                   |
| `gate_blocked`      | 없음                       | `src/middleware.ts` — 비로그인 × 회원 전용 경로       |
| `signup`            | `method` = kakao\|password | `signUpWithUsername` · `claimUsername`(pending 일 때) |
| `username_set`      | 없음                       | `claimUsername`                                       |
| `login`             | `method`                   | **U-1 미구현** — 아래 참조                            |
| `resource_download` | `slug`                     | `resources.astro` 내려받기 클릭(클라이언트)           |
| `feedback_sent`     | 없음                       | `sendFeedback`                                        |
| `submission_sent`   | `kind` = archive\|finding  | `notifySubmission`                                    |
| `signup_approved`   | 없음                       | `approvePendingMember`                                |

`login` 을 U-1 에서 안 넣은 이유: `signInWithUsername` 액션은 아이디로 이메일을 찾아 주기만 하고 실제 인증은 브라우저의 Supabase 클라이언트가 한다. 이 지점에서 기록하면 **성공이 아니라 시도**를 세게 되어 수치가 거짓이 된다. U-3 에서 클라이언트 쪽 성공 시점에 붙인다.

## 속성 값 허용목록

키만 거르는 것으로는 부족하다. 값도 허용목록으로 검사한다.

- `method` — `kakao` · `password` 만
- `slug` — 영문·숫자·하이픈 64자 이내

**자유 텍스트는 어떤 경로로도 들어오지 않는다.** 검색어 원문·제목·본문이 속성에 실릴 수 없다는 뜻이다. 검색은 횟수만 센다.

## 제외 경로

`USAGE_EXCLUDED_PREFIXES` 가 권위다.

| 접두                                                | 이유                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/proposals` · `/proposal-lookup` · `/my-proposals` | **익명 채널 보호.** 제출 직전 조회가 남으면 3단계에서 끊은 연결이 다시 생긴다 |
| `/admin`                                            | 운영자 본인 동선이라 신호가 아니다                                            |
| `/api` · `/_`                                       | 사람의 화면 이동이 아니다                                                     |
| `/offline`                                          | 서비스 워커가 내주는 대체 화면                                                |

확장자가 붙은 마지막 경로 조각은 화면이 아니라 파일로 보고 제외한다.

## normalizePage

질의문자열과 해시를 떼고 120자로 자른다. 경로에 개인정보가 실리지 않게 하는 마지막 관문이다. 검색어가 질의문자열에 들어 있어도 여기서 사라진다.

끝의 빗금은 떼어 `/bulletins` 와 `/bulletins/` 가 한 줄로 집계되게 한다.

## 계약

`sanitizeProps` 는 **던지지 않는다.** 집계 때문에 업무가 실패하면 안 된다. 허용목록 밖은 조용히 버리고, 남은 키가 없으면 `null` 을 돌려준다.

## 벽 이탈 퍼널 (U-2)

"어디에서 포기하는가"에 답하는 구간이다. 지금 앱은 비회원도 공개 메뉴를 보므로, 이탈이 가장 많이 일어나는 지점은 **회원 전용 벽**이다.

```
gate_blocked → page_view(/login) → signup → signup_approved
```

`gate_blocked` 는 **`page_view` 를 대신한다.** 비로그인이 회원 전용 화면을 열면 실제로는 화면을 못 보고 `/login` 으로 돌려보내지므로, 조회로 세면 "봤다"는 거짓이 되고 이탈 지점도 가려진다. 둘을 같이 기록하면 이중 집계가 된다.

공개/회원 판정은 `src/lib/public-paths.ts` 가 단일 권위다 — 리다이렉트를 하는 `auth-handler` 와 같은 목록을 쓴다.

`login` 은 U-3 에서 채웠다. 카카오는 서버 콜백(`exchangeCodeForSession` 성공 = 로그인 성공)이, 비밀번호는 브라우저가 기록한다 — 비밀번호 인증은 서버를 지나지 않기 때문이다.

`resource_download` 는 `archives.download_count`(자료별 누적)와 **겹치되 다르다** — 이쪽은 시계열과 회원/비회원 구분을 더한다. 순위만 볼 거면 기존 컬럼으로 충분하다.

## U-3 클라이언트 이벤트

| 이벤트          | 기록 지점                                                   |
| --------------- | ----------------------------------------------------------- |
| `offline_visit` | `track.ts` 초기화·화면 전환 시 `navigator.onLine === false` |
| `pwa_installed` | `appinstalled` 이벤트                                       |
| `push_granted`  | `settings.astro` 권한 요청 결과가 granted 일 때             |

허용목록은 클라이언트와 서버가 **같은 파일**을 쓴다. `track()` 이 보내기 전에 한 번 거르고, `/api/track` 이 저장 전에 다시 거른다. 클라이언트 검증만 믿지 않는다.
