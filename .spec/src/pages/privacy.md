# 명세: src/pages/privacy.astro

## 역할 요약

개인정보처리방침 공개 페이지(`/privacy`, `PublicLayout`). 2026-09-20 초안 — `documents/privacy_redesign_plan.md` 1단계 완료 기준("로그인 이메일 미보관", "카카오는 이용 사실을 알게 됨")과 2단계 결과(실명·이메일·명부 미보관, 소속은 본인·관리자만, 비회원 공개 계층)를 사실대로 적는다. **법적 검토 전 초안** — 시행일·연락처는 Dr. Ben 확정.

## Props

없음. 시행일은 파일 상단 `EFFECTIVE_DATE`.

## 사이드 이펙트

없음(정적 텍스트). `auth-handler.ts` publicPaths에 `/privacy` 포함 — 비로그인 접근 가능.

## 핵심 규칙

1. **코드가 하는 일만 적는다** — 문서와 동작이 어긋나면 방침이 거짓이 된다. 데이터 모델이 바뀌면(컬럼 추가·삭제, 새 위탁 서비스) 같은 PR에서 이 페이지를 고친다.
2. 카카오: 닉네임 미요청(`login.astro` scope `account_email`만), 이메일은 계정 생성용으로 일시 전달 후 즉시 파생 주소로 교체 — 이 두 문장은 실제 코드(`claimUsername`, `performSelfHealing`)와 일치해야 한다.
3. 링크: 로그인 페이지 폼 아래(`.privacy-link`)와 사이드바 하단(`.footer-link`).
4. 접속 통계(U 트랙) 도입 시 "개인을 식별하지 않는 집계" 문장을 실제 구현(HMAC 일 단위 키, 90일 파기)과 대조해 갱신.

## 이력

- 2026-09-20: 초안 신설(1단계 완료 기준 마감).
