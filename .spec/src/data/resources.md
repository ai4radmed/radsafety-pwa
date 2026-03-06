# 명세: src/data/resources.ts

## 역할 요약

정적 자료 목록. `resources` 배열 export. id, title, date, author, category, registrant, previewUrl, downloadUrl, fileName? 필드.

## Public API

| 이름        | 설명                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `resources` | 정적 배열. 작성지침/작성예시/서식/아카이브/법령정보 카테고리. previewUrl/downloadUrl은 /archive/ 경로 또는 "#" |

## 핵심 규칙

1. AGENTS.md 자료실 정책: Slug 시스템 도입 시 이 파일은 archives 테이블 기반으로 마이그레이션 대상.
2. 현재는 정적 하드코딩 유지.
