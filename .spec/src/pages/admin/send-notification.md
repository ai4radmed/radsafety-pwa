# 명세: src/pages/admin/send-notification.astro

## 역할 요약

알림 발송 페이지. targetType(전체/학회/인증상태/특정사용자) 선택, 제목·메시지·링크 입력. actions.sendNotification 호출.

## Props

없음.

## 사이드 이펙트

- notifications insert.
- sendPushToUsers (push_subscriptions 기반).

## 핵심 규칙

1. 관리자 가드: astro:page-load 내부에서 처리. **비로그인(user.id 없음)은 가드에서 제외** — DashboardLayout의 auth guard가 /login으로 리다이렉트함.
2. 로그인된 사용자 중 is_admin !== 'true'인 경우에만 alert 후 `/mypage`로 리다이렉트.
3. sendNotification server action 사용.
4. **특정사용자 검색(`#userSearch`)** — `profiles.username` 부분일치(ilike) 하나만 조회한다(2-2, 2026-09-19: `real_name`/`login_email`/`society_email` 컬럼 삭제). 드롭다운은 `@username`만 표시. "인증 상태별" 대상 옵션(`verification_status`)도 같은 날 제거 — 대상은 전체/로그인 방법별/특정 사용자 셋. 발송 후 이동은 `/admin/members`(회원 목록).
