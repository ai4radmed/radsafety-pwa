# 테스트 명세: src/consts.ts

## 대상 구현체

- 경로: `src/consts.ts`
- 명세: `.spec/src/lib/consts.md`

## 테스트 도구

Vitest (단위)

## 검증 항목

| describe         | it                | 검증 내용                                 |
| ---------------- | ----------------- | ----------------------------------------- |
| SITE_TITLE       | 예상값과 일치     | 'RadSafety'                               |
| SITE_DESCRIPTION | 예상값과 일치     | 'RadSafety Official Website'              |
| SITE_TITLE       | 타입이 string     | typeof SITE_TITLE === 'string'            |
| SITE_DESCRIPTION | 타입이 string     | typeof SITE_DESCRIPTION === 'string'      |
| APP_VERSION      | 형식 및 타입 검증 | truthy string, 예: '0.2.0'                |
| APP_RELEASE_DATE | 형식 및 타입 검증 | truthy string, 예: 'YYYY-MM-DD' 형식 여부 |

## 유지보수 목적

- SITE_TITLE, SITE_DESCRIPTION 변경 시 의도치 않은 레그레션 방지
- 브랜드/메타 변경 시 테스트 업데이트로 명시적 변경 확인

## 기존 테스트 참조

없음 (신규)
