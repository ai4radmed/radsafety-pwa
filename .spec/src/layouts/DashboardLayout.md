# 명세: src/layouts/DashboardLayout.astro

## 역할 요약

애플리케이션 전역 쉘 (Application Shell).
공통 UI 구조(Sidebar, Nav 등)를 제공하고, 클라이언트 라우팅 및 룩앤필(폰트 크기 등)을 관리한다.
핵심 비즈니스 로직은 `auth-handler.ts`에서 처리한다.

## Props

| 이름        | 타입    |
| ----------- | ------- |
| title       | string  |
| description | string  |
| scale       | number? |

## 핵심 규칙

1. **컴포넌트 조립**: BaseHead, Sidebar, MobileBottomNav, GlossaryModal, PWAInstall, LoginGuide 포함.
2. **화면 전환**: `ClientRouter`를 통해 부드러운 페이지 전환 보장.
3. **환경 설정**: `vapidPublicKey`, `urlBase64ToUint8Array`를 `window` 객체에 노출.
4. **UI 테마**: `localStorage`의 `fontSize`를 읽어 `data-font-size` 속성 적용 (초기 로드 및 `astro:after-swap`).
5. **모바일 조작**: `menuBtn` 클릭 시 사이드바 및 오버레이 토글. `overlay` 클릭 시 사이드바 닫기.
6. **로직 연동**: `auth-handler.ts`를 import하여 초기화 함수 호출.
