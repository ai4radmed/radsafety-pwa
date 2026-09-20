# 테스트 명세: setAdminRole · changePassword

## 대상 구현체

- 경로: src/actions/index.ts(setAdminRole·changePassword), src/lib/supabase-server.ts(createAnonClient), src/pages/admin/members.astro, src/pages/mypage.astro
- 명세: .spec/src/actions/index.md · .spec/src/pages/admin/members.md · .spec/src/pages/mypage.md

## 테스트 도구

Vitest (파일 소스 읽기 기반 — 권한 가드는 정적으로 고정하고, 런타임은 e2e 관리자 시나리오가 덮는다).

## 검증 항목

| describe       | it                                                   | 검증 내용                                         |
| -------------- | ---------------------------------------------------- | ------------------------------------------------- |
| setAdminRole   | 관리자만 호출(세션 기준)                             | `requireAdmin(context)`, `adminId` 입력 없음      |
| setAdminRole   | 자기 자신의 권한은 해제할 수 없다                    | 조건식·메시지                                     |
| setAdminRole   | 마지막 관리자는 해제할 수 없다                       | `count exact head` + `is_admin=true` 조회, 메시지 |
| setAdminRole   | active 회원에게만 부여, 같은 값이면 멱등             |                                                   |
| setAdminRole   | 대상 알림 1건, 알림 실패는 처리 유지                 | `createNotification`, `logger.warn`               |
| changePassword | 본인만(세션), 대상 지정 입력 없음                    | `requireUser(context)`, `targetUserId` 없음       |
| changePassword | 아이디 계정은 현재 비밀번호 재인증                   | `signInWithPassword`, 불일치 메시지               |
| changePassword | 재인증은 1회성 클라이언트                            | `createAnonClient()` 존재·사용                    |
| changePassword | 카카오 전용 계정은 현재 비밀번호 없이 최초 설정      | `provider === 'kakao'`                            |
| changePassword | 아이디 변경 기능 없음                                | `changeUsername` 부재                             |
| 화면 배선      | 회원 목록 관리자 열·본인/비활성 버튼 없음·colspan 8  |                                                   |
| 화면 배선      | 마이페이지 비밀번호 카드·카카오면 현재 비밀번호 숨김 |                                                   |
