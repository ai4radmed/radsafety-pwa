# 명세: src/components/auth/LoginButton.astro

## 역할 요약

로그인 버튼 UI. provider, label, color, textColor, icon props. data-provider 속성.

## Props

| 이름      | 타입          | 기본값  |
| --------- | ------------- | ------- |
| provider  | string        | -       |
| label     | string        | -       |
| color     | string        | -       |
| textColor | string        | 'white' |
| icon      | string (HTML) | -       |

## 핵심 규칙

1. style: background-color, color 인라인.
2. 380px 이하: font-size 0.85rem, padding 축소.
