# 명세: src/pages/index.astro

## 역할 요약

홈 페이지. RadSafety 앱 소개, 수검준비·지적권고사례·자료실·의견보내기 카드 링크, 로그인 CTA 제공.

## Props

없음. DashboardLayout 기본 사용.

## 사이드 이펙트

- astro:page-load 시 `restoreLastRouteIfNeeded()` 호출. 저장된 마지막 경로가 있고 이 탭에서 미복원이면 해당 경로로 `replace` 리다이렉트(명세: `.spec/src/lib/last-route.md`).

## 핵심 규칙

1. publicPaths에 포함되어 미인증 접근 가능.
2. 카드 링크: /inspection-prep, /findings-recommendations, /resources, /login.
3. 의견보내기: "앱 오류 및 개선사항을 관리자에게 보내기" 문구 사용.
