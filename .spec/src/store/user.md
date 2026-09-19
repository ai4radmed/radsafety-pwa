# 명세: src/store/user.ts

## 역할 요약

Nanostores 기반 클라이언트 사용자 프로필 상태. `persistentMap`으로 localStorage에 저장하며 `setUser`, `clearUser`로 갱신한다. 2단계 2-2(2026-09-19)부터 **개인정보 필드는 없다** — 아이디·상태·로그인 방식·관리자 여부·소속(기관·학회)만.

## Public API

| 이름            | 타입          | 설명                                    |
| --------------- | ------------- | --------------------------------------- |
| `userProfile`   | `WritableMap` | `userProfile` 키로 persistentMap        |
| `setUser(user)` | `void`        | user 객체를 프로필 형태로 매핑하여 저장 |
| `clearUser()`   | `void`        | 프로필 초기화                           |

### userProfile 필드

`id`, `username`, `status`, `created_at`, `is_admin`, `provider`, `society`, `hospital_id`, `hospital_request`, `can_publish`, `reject_count`, `certification`, `has_radiation_license`, `radiation_license_type`, `users_licenses`

- `username`: Stage 1-A — `profiles.username` 그대로. 미설정이면 빈 문자열.
- `status`: Phase 2 — `profiles.status`(`pending`/`active`/`suspended`/`banned`). `/claim-username`이 이 값으로 신규(pending)/기존(active)을 판정.
- `can_publish`/`reject_count`(2-1): 직접 게시 권한·반려 누적. 문자열(`'true'`/`'2'`)로 저장, 기본 `'false'`/`'0'`. 자료실·지적사례 게이트와 마이페이지 표시가 읽는다. (`verification_status`는 2-1에서 제거.)
- `hospital_id`/`hospital_request`: 소속기관 id(정적 목록 또는 `c-…` 커스텀, `'other'`) / 기관 등록 요청 텍스트. `null`은 빈 문자열로.
- 나머지(`certification`·`has_radiation_license`·`radiation_license_type`·`users_licenses`)는 파생/레거시 값 — DB 컬럼 아님.

### setUser 입력

`id`, `email`, `username?`, `status?`, `provider`, `created_at?`, `is_admin?`, `society?`, `hospital_id?`, `hospital_request?`, `can_publish?`, `reject_count?`, `licenses?`, `has_radiation_license?`, `radiation_license_type?`

## 사이드 이펙트

localStorage `userProfile` 읽기/쓰기. `getCertification(email)`(config/auth) 호출 — 이메일은 파생값 계산에만 쓰고 저장하지 않는다.

## 핵심 규칙

1. `certification`은 `getCertification(user.email)`로 계산.
2. `users_licenses`: `licenses`가 string이면 그대로, 아니면 `JSON.stringify(licenses || [])`.
3. **삭제된 필드(`login_email`·`nickname`·`real_name`·`society_email`·`affiliation`·`department`·`classification`·`license_type`·`is_safety_manager`·`safety_manager_*`·`verification_date`)는 입력에 섞여 와도 저장하지 않는다** — `setUser`가 명시 필드만 매핑한다(`auth-handler.ts`가 `...profile` 스프레드로 넘겨도 걸러짐).

## 이력

- 2026-09-19: 2-2 — 개인정보 필드 제거, `hospital_id`/`hospital_request` 추가.
- 2026-09-19: 2-1 — `can_publish`·`reject_count` 추가, `verification_status` 제거.
