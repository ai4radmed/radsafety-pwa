# 명세: src/components/GlossaryModal.astro

## 역할 요약

법령용어사전 모달. fetchGlossaryTerms로 용어 로드, 검색 필터, open-glossary 이벤트로 열기.

## Props

없음.

## 핵심 규칙

1. open-glossary 이벤트 시 display flex, body overflow hidden.
2. filterTerms: data-term, data-def에 query 포함 여부로 표시/숨김.
3. compositionend로 한글 IME 처리.
4. 모바일: align-items flex-end, slideUpMobile 애니메이션.
