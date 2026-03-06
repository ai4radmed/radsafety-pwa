# 명세: src/content.config.ts

## 역할 요약

Astro Content Collections 설정. MDX 콘텐츠의 스키마를 정의하고 `collections`로 export한다. `inspection_prep`, `findings_recommendations`, `smart_resources` 세 컬렉션을 관리한다.

## Public API

| 이름          | 설명                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `collections` | `{ inspection_prep, findings_recommendations, smart_resources }` — Astro가 인식하는 컬렉션 객체 |

### inspection_prep 스키마

| 필드         | 타입   | 필수 |
| ------------ | ------ | ---- |
| title        | string | O    |
| category     | string |      |
| importance   | string |      |
| order        | number |      |
| resourceId   | number |      |
| example      | string |      |
| exampleImage | string |      |

### findings_recommendations 스키마

| 필드            | 타입                        | 필수 |
| --------------- | --------------------------- | ---- |
| title           | string                      | O    |
| description     | string                      |      |
| category        | string                      |      |
| tags            | string[]                    |      |
| inspectionYear  | string                      |      |
| reference       | string[]                    |      |
| severity        | 'high' \| 'medium' \| 'low' |      |
| date            | Date (coerce)               |      |
| violationClause | string                      |      |
| solution        | string                      |      |

### smart_resources 스키마

| 필드     | 타입   | 필수 |
| -------- | ------ | ---- |
| title    | string | O    |
| category | string |      |
| order    | number |      |

## 사이드 이펙트

없음. `astro:content`의 `defineCollection`만 사용한다.

## 핵심 규칙

1. `type: 'content'`로 모든 컬렉션을 정의한다. (loader/glob 사용 시 `item.render` 이슈 있음)
2. `z`(zod)로 스키마를 정의한다.
3. `collections` export 시 `inspection_prep`, `findings_recommendations`, `smart_resources` 순서를 유지한다.
