# 명세: src/components/Lightbox.astro

## 역할 요약

이미지/PDF 페이지 미리보기 라이트박스. window.openLightbox(srcString) 호출. 1쪽/2쪽 보기 토글. .inline-example-btn 클릭 시 data-img로 열기.

## Props

없음.

## 핵심 규칙

1. srcString: 쉼표 구분 다중 이미지 지원.
2. spread-view 클래스로 2쪽 그리드.
3. Escape 키, 배경 클릭 시 닫기.
4. close 시 160ms 후 display none, innerHTML 비우기.
