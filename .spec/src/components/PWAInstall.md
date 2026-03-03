# 명세: src/components/PWAInstall.astro

## 역할 요약

PWA 설치 프롬프트. standalone 모드 감지 시 숨김. iOS/Android 모바일만 표시. pwa_permanent_dismiss로 영구 닫기.

## Props

없음.

## 핵심 규칙

1. isRunningStandalone: display-mode standalone, navigator.standalone, android-app referrer.
2. iOS: beforeinstallprompt 없음 → 즉시 표시, "방법 확인" 버튼으로 ios-instruction 토글.
3. Android: beforeinstallprompt → deferredPrompt.prompt().
4. 설치 수락 시 pwa_permanent_dismiss 저장.
