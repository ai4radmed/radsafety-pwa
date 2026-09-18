# 명세: src/store/user.ts

## 역할 요약

Nanostores 기반 클라이언트 사용자 프로필 상태. `persistentMap`으로 localStorage에 저장하며 `setUser`, `clearUser`로 갱신한다.

## Public API

| 이름            | 타입          | 설명                                    |
| --------------- | ------------- | --------------------------------------- |
| `userProfile`   | `WritableMap` | `userProfile` 키로 persistentMap        |
| `setUser(user)` | `void`        | user 객체를 프로필 형태로 매핑하여 저장 |
| `clearUser()`   | `void`        | 프로필 초기화                           |

### userProfile 필드

id, username, status, login_email, nickname, created_at, is_admin, provider, verification_date, verification_status, society, affiliation, department, real_name, society_email, license_type, is_safety_manager, safety_manager_start_year, safety_manager_end_year, classification, certification, has_radiation_license, radiation_license_type, users_licenses

- `username`: Stage 1-A(`documents/privacy_redesign_plan.md` 1단계) — 아이디/비밀번호 로그인 사용자의 이름표. `profiles.username`을 그대로 반영. 미설정(카카오·전환 전 이메일 사용자)이면 빈 문자열.
- `status`: Phase 2(2단계 개정 — 2계층+가입승인+제재, `sql_query/migrate_add_member_status_hospital.sql`) — `profiles.status`를 그대로 반영(`pending`/`active`/`suspended`/`banned`). `/claim-username`이 이 값으로 "신규 가입자인지"(pending) "기존 전환 대상인지"(active) 판정해 소속기관·소속학회 입력란 노출 여부를 정한다.

### setUser 입력

id, email, username?, status?, login_email?, provider, nickname?, created_at?, is_admin?, verification_date?, verification_status?, society?, affiliation?, department?, real_name?, society_email?, license_type?, is_safety_manager?, safety_manager_start_year?, safety_manager_end_year?, classification?, society_name?, licenses?, user_tier?, safety_manager_start_date?, safety_manager_end_date?, is_safety_practice_staff?, has_radiation_license?, radiation_license_type?

## 사이드 이펙트

localStorage `userProfile` 읽기/쓰기. `getCertification`(config/auth) 호출.

## 핵심 규칙

1. `certification`은 `getCertification(user.email)`로 계산.
2. `real_name` fallback: `user.real_name || user.society_name`.
3. `users_licenses`: `licenses`가 string이면 그대로, 아니면 `JSON.stringify(licenses || [])`.
