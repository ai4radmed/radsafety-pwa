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

id, login_email, nickname, created_at, is_admin, provider, verification_date, verification_status, society, affiliation, department, real_name, society_email, license_type, is_safety_manager, safety_manager_start_year, safety_manager_end_year, classification, certification, has_radiation_license, radiation_license_type, users_licenses

### setUser 입력

id, email, login_email?, provider, nickname?, created_at?, is_admin?, verification_date?, verification_status?, society?, affiliation?, department?, real_name?, society_email?, license_type?, is_safety_manager?, safety_manager_start_year?, safety_manager_end_year?, classification?, society_name?, licenses?, user_tier?, safety_manager_start_date?, safety_manager_end_date?, is_safety_practice_staff?, has_radiation_license?, radiation_license_type?

## 사이드 이펙트

localStorage `userProfile` 읽기/쓰기. `getCertification`(config/auth) 호출.

## 핵심 규칙

1. `certification`은 `getCertification(user.email)`로 계산.
2. `real_name` fallback: `user.real_name || user.society_name`.
3. `users_licenses`: `licenses`가 string이면 그대로, 아니면 `JSON.stringify(licenses || [])`.
