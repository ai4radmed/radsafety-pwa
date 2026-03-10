# 명세: src/components/BaseHead.astro

## 역할 요약

전역 메타데이터 및 head 요소. global.css import, charset, viewport, favicon, sitemap, RSS, canonical, Open Graph, Twitter 카드, PWA registerSW 스크립트.

## Props

| 이름        | 타입          | 기본값        |
| ----------- | ------------- | ------------- |
| title       | string        | -             |
| description | string        | -             |
| image       | ImageMetadata | FallbackImage |
| scale       | number        | 1             |

## 핵심 규칙

1. canonicalURL: `new URL(Astro.url.pathname, Astro.site)`.
2. og:image, twitter:image: `new URL(image.src, Astro.url)`.
3. PWA: `import.meta.env.PROD`일 때만 `<script src="/registerSW.js"></script>` 수동 추가. (dev 모드 404 방지)
4. favicon: public에 존재하는 favicon.svg 사용. `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`
5. apple-touch-icon: favicon.svg 사용 (404 방지). `<link rel="apple-touch-icon" href="/favicon.svg" />`
6. PWA 매니페스트: `<link rel="manifest" href="/manifest.webmanifest" />`. iOS 홈화면 추가 시 standalone PWA로 설치되기 위한 필수 태그.
7. iOS standalone: `<meta name="apple-mobile-web-app-capable" content="yes" />`. iOS Safari에서 홈화면 추가 시 Safari UI 없이 독립 앱으로 실행되도록 지시.
8. iOS 상태바: `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`. standalone 모드의 상태바 스타일.
