# 명세: src/pages/admin-guide.astro

## 역할 요약

관리자 안내 페이지. 관리자 로그인 확인, 회원명부 등록, 인증요청 검토, 알림 발송, 의견 관리, 용어 관리 안내.

## Props

| 이름  | 타입                   |
| ----- | ---------------------- |
| title | string ("관리자 안내") |

## 사이드 이펙트

없음.

## 핵심 규칙

1. 관리자 전용 페이지. isAdmin 체크는 DashboardLayout에서 수행.
2. 정적 안내 콘텐츠만 제공.
3. 가독성: 긴 문단 대신 각 섹션(1~3)과 주요 안내 섹션(예: 5. 의견 관리)은 `ul.feature-list` 불릿 항목으로 구성하고, 핵심 키워드는 `strong`으로 강조한다.

## 5. 의견 관리 섹션 요구사항

5번 섹션에는 다음 흐름이 포함되어야 한다.

1. 사용자가 <strong>의견보내기</strong>로 제출하면 앱의 <strong>의견 관리</strong>로 수신되며, <strong>관리자 이메일</strong>로도 발송된다.
2. 접수의 최초 상태는 <strong>검토중</strong>이다.
3. 관리자가 <strong>관리자 의견(admin_note)</strong>을 작성하면 사용자 사이드메뉴의 <strong>개선의견조회</strong>에 노출된다.
4. 관리자는 상태를 <strong>보류</strong> 또는 <strong>완료</strong>로 수정할 수 있다.
