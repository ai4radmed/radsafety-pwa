# 로그 시스템 가이드

## 개요

RadSafety PWA는 운영 중 문제를 신속하게 발견하고 대응하기 위해 구조화된 로그 시스템을 사용합니다.

## 로그 레벨 설정

### 환경변수 설정

`.env` 파일의 `PUBLIC_LOG_LEVEL` 변수로 제어:

```env
PUBLIC_LOG_LEVEL=info   # 모든 로그 출력 (개발용)
PUBLIC_LOG_LEVEL=warn   # 경고 이상만 출력 (기본값)
PUBLIC_LOG_LEVEL=error  # 에러만 출력 (운영 권장)
```

### 로그 레벨 우선순위

| 레벨    | 우선순위 | 용도           | 운영 환경             |
| ------- | -------- | -------------- | --------------------- |
| `info`  | 낮음     | 정상 동작 기록 | ❌ 비추천 (과다 로그) |
| `warn`  | 중간     | 잠재적 문제    | ✅ 추천               |
| `error` | 높음     | 실제 오류      | ✅ 추천               |

---

## 로그 출력 위치 및 내용

### 1. API 엔드포인트

#### 📁 `/api/archives/view/[slug]` (자료실 PDF 조회)

**INFO 로그**:

```json
{
    "level": "info",
    "module": "archives-view-api",
    "message": "자료 조회 성공",
    "data": {
        "slug": "safety-regulations-guide",
        "title": "안전관리규정 작성지침",
        "file": "안전관리규정_작성지침.pdf"
    },
    "timestamp": "2026-02-21T03:00:00.000Z"
}
```

**ERROR 로그**:

- Slug 없음
- 자료를 찾을 수 없음
- 파일이 첨부되지 않음
- 조회수 증가 실패
- Public URL 생성 실패
- 예상치 못한 오류

**보안 고려사항**: ✅ 안전 (파일명/제목만 노출, 민감정보 없음)

---

#### 📁 `/api/archives/[id]` (자료실 상세 조회)

**ERROR 로그**:

```json
{
    "level": "error",
    "module": "archives-api",
    "message": "아카이브 조회 실패",
    "data": {
        "id": "uuid",
        "error": {
            /* Supabase error */
        }
    }
}
```

**보안 고려사항**: ⚠️ 주의 (Supabase 에러 객체 포함 가능)

---

#### 📁 `/api/push/subscribe` (푸시 알림 구독)

**INFO 로그**:

```json
{
    "level": "info",
    "module": "push-subscribe",
    "message": "푸시 구독 저장 완료",
    "data": {
        "userId": "uuid"
    }
}
```

**ERROR 로그**:

- 푸시 구독 저장 실패
- 푸시 구독 API 오류

**보안 고려사항**: ✅ 안전 (userId만 노출)

---

#### 📁 `/api/push/unsubscribe` (푸시 알림 구독 해제)

**INFO 로그**:

```json
{
    "level": "info",
    "module": "push-unsubscribe",
    "message": "푸시 구독 해제 완료",
    "data": {
        "userId": "uuid"
    }
}
```

**ERROR 로그**:

- 푸시 구독 삭제 실패
- 푸시 구독 해제 API 오류

**보안 고려사항**: ✅ 안전

---

### 2. 이메일 발송 (`src/lib/email.ts`)

#### 인증 이메일 발송

**INFO 로그**:

```json
{
    "level": "info",
    "module": "email",
    "message": "개발모드: 인증 이메일 스킵",
    "data": {
        "to": "user@example.com",
        "code": "123456"
    }
}
```

**⚠️ 보안 위험**: 개발 모드에서 **인증 코드**가 로그에 노출됨

- **권장**: 운영 환경에서는 `PUBLIC_LOG_LEVEL=error` 설정 필수
- **개선 필요**: 인증 코드를 로그에서 제거

**ERROR 로그**:

- 이메일 발송 실패
- 이메일 발송 중 예외

**보안 고려사항**: ⚠️ 주의 (이메일 주소 노출)

---

#### 피드백 이메일 발송

**INFO 로그**:

```json
{
    "level": "info",
    "module": "email",
    "message": "개발모드: 피드백 이메일 스킵",
    "data": {
        "from": "user@example.com",
        "subject": "기능 요청",
        "feedbackId": "uuid"
    }
}
```

**ERROR 로그**:

- 피드백 이메일 발송 실패
- 피드백 이메일 발송 중 예외

**보안 고려사항**: ⚠️ 주의 (이메일 주소 노출)

---

### 3. 알림 시스템 (`src/lib/notification-helper.ts`)

**INFO 로그**:

- 알림 생성 완료
- 대량 알림 생성 완료

**ERROR 로그**:

- 알림 생성 실패
- 웹 푸시 발송 오류
- 대량 알림 생성 실패
- 대량 웹 푸시 발송 오류
- 사용자 필터 조회 실패

**보안 고려사항**: ✅ 안전 (userId, 알림 타입만 노출)

---

### 4. 웹 푸시 (`src/lib/push.ts`)

**ERROR 로그**:

```json
{
    "level": "error",
    "module": "push",
    "message": "VAPID 키가 설정되지 않았습니다. 웹 푸시를 발송할 수 없습니다."
}
```

**보안 고려사항**: ✅ 안전

---

## 보안 위험 요약

### 🔴 높은 위험 (개선 필요)

#### 1. **인증 코드 노출** (`src/lib/email.ts:42`)

```typescript
logger.info('개발모드: 인증 이메일 스킵', { to, code });
```

**문제점**:

- 개발 모드에서 6자리 인증 코드가 로그에 평문으로 노출
- 로그 유출 시 계정 탈취 가능

**권장 조치**:

```typescript
// ❌ 현재
logger.info('개발모드: 인증 이메일 스킵', { to, code });

// ✅ 개선
logger.info('개발모드: 인증 이메일 스킵', { to, codeLength: code.length });
```

---

### 🟡 중간 위험 (주의 필요)

#### 1. **이메일 주소 노출**

- `email.ts`: 인증 이메일, 피드백 이메일 발송 시 이메일 주소 로그 출력
- **권장**: 운영 환경에서는 `PUBLIC_LOG_LEVEL=error`로 설정하여 INFO 로그 비활성화

#### 2. **Supabase 에러 객체 노출**

- API 에러 로그에 Supabase 원본 에러 객체 포함
- 내부 데이터베이스 구조 노출 가능성
- **권장**: 에러 메시지만 로그, 전체 객체는 제외

---

### 🟢 낮은 위험 (안전)

- 자료실 조회 로그: 파일명, 제목만 노출
- 푸시 알림 로그: userId만 노출
- 알림 시스템 로그: 메타데이터만 노출

---

## 운영 환경 권장 설정

### 1. `.env.production` 설정

```env
# 에러만 로그 (경고/정보 로그 비활성화)
PUBLIC_LOG_LEVEL=error
```

### 2. 로그 모니터링 체크리스트

**정기적으로 확인해야 할 에러 로그**:

| 모듈                | 메시지                   | 우선순위 | 조치                        |
| ------------------- | ------------------------ | -------- | --------------------------- |
| `archives-view-api` | 자료를 찾을 수 없음      | 중       | Slug 확인, 자료실 등록 확인 |
| `archives-view-api` | 파일이 첨부되지 않음     | 높음     | 파일 업로드 확인            |
| `push-subscribe`    | 푸시 구독 저장 실패      | 중       | Supabase 연결 확인          |
| `email`             | 이메일 발송 실패         | 높음     | Resend API 키 확인          |
| `push`              | VAPID 키가 설정되지 않음 | 높음     | 환경변수 확인               |

---

## 로그 포맷

모든 로그는 JSON 형식으로 출력됩니다:

```json
{
    "level": "error",
    "module": "archives-view-api",
    "message": "자료를 찾을 수 없음",
    "data": {
        "slug": "non-existent-file",
        "error": {
            /* 에러 세부 정보 */
        }
    },
    "timestamp": "2026-02-21T03:00:00.000Z"
}
```

### 필드 설명

- `level`: 로그 레벨 (`info`, `warn`, `error`)
- `module`: 로그 발생 모듈명
- `message`: 한글 메시지
- `data`: 추가 컨텍스트 정보 (선택사항)
- `timestamp`: ISO 8601 형식의 타임스탬프

---

## 개선 권장사항

### 1. 즉시 개선 (보안)

- [ ] 인증 코드를 로그에서 제거 (`email.ts:42`)
- [ ] 운영 환경 `.env.production`에 `PUBLIC_LOG_LEVEL=error` 설정

### 2. 중장기 개선 (운영 효율)

- [ ] 로그 수집 시스템 도입 (예: Sentry, LogRocket)
- [ ] 에러 알림 자동화 (Slack, 이메일)
- [ ] 로그 분석 대시보드 구축

### 3. 코드 개선

- [ ] Supabase 에러 객체를 로그에서 제외하고 메시지만 출력
- [ ] 민감 정보 자동 필터링 함수 추가

```typescript
// 예시: 민감 정보 필터링
function sanitizeLogData(data: unknown): unknown {
    // 이메일, 인증 코드, 비밀번호 등 제거
    // ...
}
```

---

## 참고

- 로거 구현: `src/lib/logger.ts`
- 로거 테스트: `tests/unit/lib/logger.test.ts`
- 환경변수: `.env` 파일의 `PUBLIC_LOG_LEVEL`
