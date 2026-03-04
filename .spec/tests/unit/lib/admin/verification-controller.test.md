# 테스트 명세: VerificationController 단위 테스트

## 목적

`VerificationController`의 데이터 가공, 필터링 로직이 정상적으로 동작하는지 검증합니다.

## 테스트 항목

1. **데이터 필터링 (`filterUsers`)**
    - 검색어 입력 시 이름, 이메일, 소속 정보를 포함하는 사용자만 걸러지는지 확인.
    - 대소문자 구분 없이 검색되는지 확인.
    - 검색어가 비어있을 경우 전체 목록이 반환되는지 확인.

2. **탭별 날짜 매핑 로직**
    - `loadUsers` 후 `renderUsers` 호출 시 각 탭 상태에 맞는 날짜 컬럼 정보가 올바르게 생성되는지 확인.
    - `none` 탭일 경우 `created_at` 날짜를 사용하는지 확인.
    - `verified` 탭일 경우 `approved_at` 날짜를 사용하는지 확인.
