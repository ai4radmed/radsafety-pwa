# 테스트 명세: tests/unit/pages/admin-guide.test.ts

## 대상 구현체

- 경로: `src/pages/admin-guide.astro`
- 명세: `.spec/src/pages/admin-guide.md`

## 테스트 방식

`fs.readFileSync`로 `admin-guide.astro` 원문을 읽고,
섹션 1~3이 `ul.feature-list` 불릿 구조를 가지며 핵심 키워드가 포함되는지 정적 검증한다.

## 검증 항목

| describe    | it               | 검증 내용                                                          |
| ----------- | ---------------- | ------------------------------------------------------------------ |
| admin-guide | 불릿 리스트 사용 | `ul class="feature-list"`가 포함되어 있다                          |
| admin-guide | 섹션 1 구성      | `ADMIN 배지` 및 `관리자로 로그인 확인` 관련 텍스트가 포함되어 있다 |
| admin-guide | 섹션 2 구성      | `회원명부` 및 `엑셀` 관련 텍스트가 포함되어 있다                   |
| admin-guide | 섹션 3 구성      | `자동 인증` 및 `승인`/`취소` 관련 텍스트가 포함되어 있다           |
