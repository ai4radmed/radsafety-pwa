# 테스트 명세: tests/unit/pages/guide-safety-term.test.ts

## 대상 구현체

- 페이지: `src/pages/guide.astro`
- 명세: `.spec/src/pages/guide.md`

## 테스트 방식

`fs.readFileSync`로 `guide.astro` 원문을 읽고, 특정 용어 라벨 문자열이 존재하는지 정적 문자열 포함 여부로 검증한다.

## 검증 항목

| describe | it                    | 검증 내용                                                         |
| -------- | --------------------- | ----------------------------------------------------------------- |
| guide    | 선임기간 라벨 확인    | `선임기간` 라벨(`<strong>선임기간</strong>`)이 존재한다           |
| guide    | 준수 기간 라벨 미존재 | `준수 기간` 라벨(`<strong>준수 기간</strong>`)은 존재하면 안 된다 |
