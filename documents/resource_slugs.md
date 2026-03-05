# 자료실 Slug 레지스트리

이 문서는 자료실(`archives` 테이블)의 모든 slug를 관리합니다.

## 중요 원칙

⚠️ **Slug는 한 번 설정하면 절대 변경하지 않습니다!**

- Slug 변경 시 모든 체크리스트, 알림, 외부 링크가 깨집니다
- 자료 삭제 후 재등록 시에도 동일한 slug를 재사용해야 합니다
- 새 버전이 필요하면 slug 끝에 버전을 추가합니다 (예: `guide-v2`)

## Slug 작성 규칙

- 영문 소문자, 숫자, 하이픈(`-`)만 사용
- 의미있고 간결하게 작성
- 예시: `safety-management-regulations-preparation-guide`, `radiation-report-2024`, `checklist-example`

## 등록된 Slug 목록

### 작성지침

| 제목                      | Slug                                              | 참조 위치     | 등록일     |
| ------------------------- | ------------------------------------------------- | ------------- | ---------- |
| 안전관리규정 작성지침     | `safety-management-regulations-preparation-guide` | 체크리스트 02 | 2026-03-05 |
| 방사선안전보고서 작성지침 | `safety-report-on-radiation-preparation-guide`    | 체크리스트 02 | 2026-03-05 |

### 작성예시

| 제목                              | Slug                                             | 참조 위치      | 등록일     |
| --------------------------------- | ------------------------------------------------ | -------------- | ---------- |
| 안전관리규정 예시                 | `safety-management-regulations-sample`           | 체크리스트 02  | 2026-03-05 |
| 방사선원 사용현황 작성예시        | `radiation-source-usage-example`                 | 체크리스트 02b | 미등록     |
| 방사선원 생산·판매현황 작성예시   | `radiation-source-production-sales-example`      | 체크리스트 02b | 미등록     |
| 방사선기기 설계승인서 예시        | `radiation-equipment-design-approval-sample`     | 체크리스트 00a | 2026-03-05 |
| 정기검사 결과통보공문 예시        | `periodic-inspection-result-notification-sample` | 체크리스트 01  | 2026-03-05 |
| 검사지적 권고사항 시정보고서 예시 | `inspection-corrective-action-report-sample`     | 체크리스트 01  | 2026-03-05 |

### 가이드북

| Slug | 제목 | 카테고리 | 참조 위치 | 등록일 |
| ---- | ---- | -------- | --------- | ------ |
| -    | -    | 가이드북 | -         | -      |

### 발표자료

| Slug | 제목 | 카테고리 | 참조 위치 | 등록일 |
| ---- | ---- | -------- | --------- | ------ |
| -    | -    | 발표자료 | -         | -      |

### 법정양식

| Slug                                | 제목                             | 카테고리 | 참조 위치      | 등록일 |
| ----------------------------------- | -------------------------------- | -------- | -------------- | ------ |
| `radiation-worker-health-exam-form` | 방사선작업종사자 건강진단서 양식 | 법정양식 | 체크리스트 02e | 미등록 |

### 기준/규정

| Slug                            | 제목                                    | 카테고리  | 참조 위치      | 등록일 |
| ------------------------------- | --------------------------------------- | --------- | -------------- | ------ |
| `emission-management-standards` | 배출관리기준 (방사선방호등에 관한 기준) | 기준/규정 | 체크리스트 02f | 미등록 |

### 기타

| Slug | 제목 | 카테고리 | 참조 위치 | 등록일 |
| ---- | ---- | -------- | --------- | ------ |
| -    | -    | 기타     | -         | -      |

## 체크리스트별 필요 자료

### 02-safety-management-regulations-report.md

- `safety-management-regulations-preparation-guide` - 안전관리규정 작성지침
- `safety-management-regulations-sample` - 안전관리규정 예시
- `safety-report-on-radiation-preparation-guide` - 방사선안전보고서 작성지침

### 01-previous-inspection-records.md

- `periodic-inspection-result-notification-sample` - 예시
- `inspection-corrective-action-report-sample` - 예시

### 00a-permit-design-approval.md

- `radiation-equipment-design-approval-sample` - 예시

### 02b-radiation-source-records.md

- `radiation-source-usage-example` - 방사선원 사용현황 작성예시
- `radiation-source-production-sales-example` - 방사선원 생산·판매현황 작성예시

### 02e-worker-data.md

- `radiation-worker-health-exam-form` - 방사선작업종사자 건강진단서 양식

### 02f-waste-data.md

- `emission-management-standards` - 배출관리기준

### (추가 필요)

체크리스트를 검토하며 필요한 slug를 추가합니다.

## 변경 이력

| 날짜       | 변경 내용      | 담당자 |
| ---------- | -------------- | ------ |
| 2026-02-19 | 문서 초안 작성 | Claude |

## 주의사항

1. **새 자료 등록 시**

- 이 문서에 먼저 slug 등록
    - 중복 확인 (Ctrl+F)
    - 자료실에 등록 후 "등록일" 업데이트

2. **자료 삭제 시**

- 이 문서에서 slug 삭제 금지 (재등록 대비)
    - "참조 위치" 칸에 "삭제됨 (YYYY-MM-DD)" 표기

3. **체크리스트 링크 변경 시**

- 이 문서 확인하여 정확한 slug 사용
    - 변경 후 실제 링크 동작 테스트 필수
