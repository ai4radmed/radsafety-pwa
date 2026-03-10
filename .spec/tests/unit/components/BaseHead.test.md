# 테스트 명세: tests/unit/components/BaseHead.test.ts

## 대상 구현체

`src/components/BaseHead.astro`

## 테스트 방식

소스 파일을 `fs.readFileSync`로 읽어 필수 HTML 태그 존재 여부를 검증 (Astro 컴포넌트 런타임 불필요).

## 테스트 케이스

| #   | 케이스                                | 검증 내용                                                                  |
| --- | ------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 파일 존재                             | `src/components/BaseHead.astro` 파일이 존재한다                            |
| 2   | PWA 매니페스트 링크                   | `<link rel="manifest" href="/manifest.webmanifest"` 가 포함되어 있다       |
| 3   | apple-mobile-web-app-capable          | `<meta name="apple-mobile-web-app-capable" content="yes"` 가 포함되어 있다 |
| 4   | apple-mobile-web-app-status-bar-style | `<meta name="apple-mobile-web-app-status-bar-style"` 가 포함되어 있다      |
| 5   | apple-touch-icon                      | `<link rel="apple-touch-icon"` 가 포함되어 있다                            |
| 6   | favicon                               | `<link rel="icon" href="/favicon.svg"` 가 포함되어 있다                    |
| 7   | registerSW 조건부 로드                | `registerSW.js` 문자열이 포함되어 있다                                     |
