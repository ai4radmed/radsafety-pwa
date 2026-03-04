# 명세: src/pages/admin/verification-requests.astro

## 역할 요약

회원 인증 및 권한 관리 페이지. 사용자의 인증 상태를 탭별로 조회하고, 인증 요청에 대한 승인·인증 취소 처리를 수행합니다.

## Props

없음.

## 사이드 이펙트

- `profiles` 테이블 업데이트: 인증 상태(`verification_status`), 관리자 여부(`is_admin`) 등 변경.
- `verification_requests` 테이블 업데이트: 요청 상태 및 승인/반려 기록.
- `notifications` 테이블: 승인/취소 결과 알림 발송.

## 핵심 규칙

1. **접근 제어**: `is_admin` 권한이 있는 사용자만 접근 가능.
2. **동적 렌더링**: `export const prerender = false`.
3. **컴포넌트 구성**:
    - `VerificationTabs`: 상단 탭.
    - `VerificationTable`: 중앙 목록.
    - `VerificationDetailModal`: 상세 정보 팝업.
4. **로직 위임**: 모든 데이터 처리 및 이벤트 핸들링은 `src/lib/admin/verification-controller.ts`에서 담당.
5. **SEO/Layout**: `DashboardLayout`을 사용하여 통일된 관리자 UI 제공.
