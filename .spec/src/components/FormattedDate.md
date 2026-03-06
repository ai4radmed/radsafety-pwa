# 명세: src/components/FormattedDate.astro

## 역할 요약

날짜 포맷 출력. `<time datetime={ISO}>` + en-us locale (year, month short, day numeric).

## Props

| 이름 | 타입 |
| ---- | ---- |
| date | Date |

## 핵심 규칙

1. datetime: date.toISOString().
2. toLocaleDateString('en-us', { year: 'numeric', month: 'short', day: 'numeric' }).
