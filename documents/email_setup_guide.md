# 이메일 발송 설정 가이드

## 목차
1. [Resend 설정 (권장)](#resend-설정-권장)
2. [개발 환경 테스트](#개발-환경-테스트)
3. [프로덕션 배포](#프로덕션-배포)
4. [대안 서비스](#대안-서비스)
5. [트러블슈팅](#트러블슈팅)

---

## Resend 설정 (권장)

### 1단계: Resend 계정 생성
1. [Resend 가입](https://resend.com/signup)
2. 이메일 인증 완료
3. 무료 플랜 선택 (월 3,000통)

### 2단계: API Key 발급
1. Dashboard → [API Keys](https://resend.com/api-keys)
2. "Create API Key" 클릭
3. Name: `radsafety-pwa-production`
4. Permission: **Full Access** (또는 Sending access만)
5. 생성된 키 복사 (한 번만 표시됨!) → `re_xxxxxxxxxxxxxxxx`

### 3단계: 도메인 인증
**옵션 A: Resend 도메인 사용 (즉시 사용 가능)**
- From: `noreply@resend.dev` 사용
- 설정 불필요, 바로 발송 가능
- 단점: 브랜드 신뢰도 낮음

**옵션 B: 자체 도메인 사용 (권장)**
1. Dashboard → [Domains](https://resend.com/domains)
2. "Add Domain" → 도메인 입력 (예: `radsafety.com`)
3. DNS 레코드 추가:
   ```
   Type: TXT
   Name: _resend
   Value: [Resend가 제공하는 값]

   Type: MX
   Name: @
   Priority: 10
   Value: feedback-smtp.resend.com
   ```
4. Cloudflare DNS에 레코드 추가
5. Resend에서 "Verify" 클릭 (최대 48시간 소요)

### 4단계: 환경 변수 설정

`.env` 파일에 추가:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

Vercel 배포 시:
1. Vercel Dashboard → Settings → Environment Variables
2. Key: `RESEND_API_KEY`
3. Value: `re_xxxxxxxxxxxxxxxx`
4. Scope: **Production**, Preview, Development 모두 체크

### 5단계: 발신 이메일 주소 수정

`src/lib/email.ts` 파일 수정:
```typescript
// 도메인 인증 전 (Resend 도메인 사용)
from: '방사선안전관리통합시스템 <noreply@resend.dev>',

// 도메인 인증 후 (자체 도메인 사용)
from: '방사선안전관리통합시스템 <noreply@radsafety.com>',
```

---

## 개발 환경 테스트

### 현재 동작 방식
- **개발 환경** (`npm run dev`): 이메일을 실제로 발송하지 않고 콘솔에만 출력
- **프로덕션** (`vercel` 또는 `npm run build`): 실제 이메일 발송

### 테스트 방법

**1. 콘솔 확인 (개발 환경)**
```bash
npm run dev
```

마이페이지에서 "인증 코드 발송" 클릭 시:
```
[DEV] Verification email to test@example.com
[DEV] Code: 123456
```

**2. 실제 발송 테스트 (프로덕션 빌드)**
```bash
# 로컬에서 프로덕션 빌드 테스트
npm run build
npm run preview

# 또는 환경 변수 강제 설정
NODE_ENV=production npm run dev
```

**3. Resend Dashboard 확인**
- [Emails](https://resend.com/emails) 페이지에서 발송 내역 확인
- 상태: `delivered`, `bounced`, `complained` 등

---

## 프로덕션 배포

### Vercel 배포 체크리스트
- [ ] `RESEND_API_KEY` 환경 변수 설정
- [ ] 도메인 인증 완료 (선택사항)
- [ ] `src/lib/email.ts`의 `from` 주소 수정
- [ ] 테스트 이메일 발송 확인

### 배포 후 테스트
1. 프로덕션 URL 접속
2. 마이페이지 → 학회/특별사용자 탭
3. 본인 이메일 입력 → "인증 코드 발송"
4. 이메일 수신 확인 (스팸함 확인!)
5. 코드 입력 → 검증 완료

---

## 대안 서비스

### AWS SES
**장점:** 가장 저렴 (월 62,000통 무료*)
**단점:** 초기 샌드박스 해제 필요, 복잡한 설정

```typescript
// src/lib/email-ses.ts 예시
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const client = new SESClient({ region: 'ap-northeast-1' });

export async function sendVerificationEmail({ to, code }: any) {
    const command = new SendEmailCommand({
        Source: 'noreply@radsafety.com',
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: '[방사선안전] 이메일 인증 코드' },
            Body: { Html: { Data: getEmailTemplate(code) } }
        }
    });

    await client.send(command);
}
```

### SendGrid
**장점:** 대기업 사용, 안정적
**단점:** 무료 100통/일만, 복잡한 UI

```typescript
// src/lib/email-sendgrid.ts 예시
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendVerificationEmail({ to, code }: any) {
    await sgMail.send({
        from: 'noreply@radsafety.com',
        to,
        subject: '[방사선안전] 이메일 인증 코드',
        html: getEmailTemplate(code),
    });
}
```

---

## 트러블슈팅

### 문제 1: "RESEND_API_KEY is undefined"
**원인:** 환경 변수가 로드되지 않음

**해결:**
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. 개발 서버 재시작 (`Ctrl+C` → `npm run dev`)
3. Vercel: 환경 변수 설정 후 재배포 필요

### 문제 2: 이메일이 스팸함으로 이동
**원인:** 도메인 인증 미완료 또는 SPF/DKIM 설정 부족

**해결:**
1. Resend 도메인 인증 완료
2. DNS 레코드 정확히 추가 (TTL: 300초 권장)
3. 수신자에게 안전한 발신자로 등록 요청

### 문제 3: "Domain not verified"
**원인:** 도메인 인증 대기 중

**해결:**
1. Cloudflare DNS에 레코드가 정확히 추가되었는지 확인
2. 최대 48시간 대기 (보통 5분 내 완료)
3. 인증 전에는 `noreply@resend.dev` 사용

### 문제 4: 개발 환경에서도 실제 발송되는 경우
**원인:** `import.meta.env.DEV`가 `false`로 인식됨

**해결:**
```typescript
// src/lib/email.ts 수정
if (import.meta.env.DEV || !import.meta.env.RESEND_API_KEY) {
    console.log('[DEV] Skipping email send');
    return { success: true, messageId: 'dev-mode' };
}
```

### 문제 5: 한글이 깨져서 수신됨
**원인:** UTF-8 인코딩 문제

**해결:** HTML 템플릿에 charset 확인
```html
<meta charset="UTF-8">
```

---

## 비용 산정

### 예상 발송량
- 사용자당 평균 인증: 1~2회
- 월 100명 가입 시: 200통
- **무료 티어로 충분** (월 3,000통)

### 비용 예시
| 월 사용자 수 | 예상 발송량 | Resend 비용 | AWS SES 비용 |
|------------|-----------|------------|-------------|
| 100명 | 200통 | **무료** | 무료 |
| 500명 | 1,000통 | **무료** | 무료 |
| 2,000명 | 4,000통 | $20/월 | 무료 |
| 10,000명 | 20,000통 | $20/월 | 무료 |

---

## 참고 링크
- [Resend 공식 문서](https://resend.com/docs)
- [Resend Astro 가이드](https://resend.com/docs/send-with-astro)
- [Resend 가격](https://resend.com/pricing)
- [Resend API Keys](https://resend.com/api-keys)
- [Resend Domains](https://resend.com/domains)

---

## 다음 단계
- [ ] Resend 계정 생성
- [ ] API Key 발급
- [ ] `.env`에 키 추가
- [ ] 테스트 이메일 발송
- [ ] (선택) 도메인 인증
- [ ] Vercel 환경 변수 설정
- [ ] 프로덕션 배포 및 테스트
