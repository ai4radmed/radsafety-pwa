# 명세: src/data/glossary.ts

## 역할 요약

용어집 데이터. `fetchGlossaryTerms`로 glossary_terms 테이블 조회, 실패 시 FALLBACK_TERMS 반환. `glossaryTerms`는 하위 호환용 정적 export.

## Public API

| 이름                   | 설명                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `Term`                 | id?, term, definition, sort_order?                                                           |
| `fetchGlossaryTerms()` | supabaseAnon.from('glossary_terms').select('\*').order('sort_order'). 실패 시 FALLBACK_TERMS |
| `glossaryTerms`        | FALLBACK_TERMS (하위 호환)                                                                   |

## FALLBACK_TERMS

허가사용자, 신고사용자, 방사선안전관리자, 수시출입자, 방사선작업종사자, 방사선관리구역, 자체처분, 표면오염도, 공간선량률, 선임, 정기검사 (11개).

## 핵심 규칙

1. error 또는 !data 시 FALLBACK_TERMS.
2. catch 시에도 FALLBACK_TERMS.
