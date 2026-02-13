# 이메일 발송 빠른 시작 가이드

## 🚀 5분 안에 설정하기

### 1단계: Resend 가입 (2분)
```bash
# 1. https://resend.com/signup 접속
# 2. 이메일로 가입 (GitHub 로그인도 가능)
# 3. 이메일 인증 완료
```

### 2단계: API Key 발급 (1분)
```bash
# 1. Dashboard → API Keys
# 2. "Create API Key" 클릭
# 3. Name: "radsafety-pwa"
# 4. 생성된 키 복사: re_xxxxxxxxxxxxxxxx
```

### 3단계: 환경 변수 설정 (1분)
```bash
# .env 파일에 추가
echo "RESEND_API_KEY=re_xxxxxxxxxxxxxxxx" >> .env

# 개발 서버 재시작
npm run dev
```

### 4단계: 테스트 (1분)
1. http://localhost:4321/mypage 접속
2. 학회 탭 → 이메일 입력
3. "인증 코드 발송" 클릭
4. 터미널에서 코드 확인:
   ```
   [DEV] Verification code for test@example.com: 123456
   ```

---

## ✅ 현재 상태

### 개발 환경 (지금)
- ✅ 이메일을 **실제로 발송하지 않음**
- ✅ 콘솔에 코드만 출력
- ✅ DB에는 정상 저장
- ✅ 검증 플로우 정상 작동

### 프로덕션 (배포 시)
- ⏳ Resend API Key 필요
- ⏳ 실제 이메일 발송
- ⏳ Vercel 환경 변수 설정

---

## 📋 프로덕션 배포 체크리스트

```bash
# Vercel Dashboard
1. Settings → Environment Variables
2. RESEND_API_KEY = re_xxxxxxxxxxxxxxxx
3. Production, Preview, Development 체크
4. Save

# 재배포
git push origin main
```

---

## 🔧 선택사항: 자체 도메인 사용

**현재:** `noreply@resend.dev` 사용 (즉시 가능)
**나중에:** `noreply@radsafety.com` 사용 (도메인 인증 필요)

**도메인 인증 방법:**
1. Resend Dashboard → Domains → Add Domain
2. Cloudflare DNS에 TXT, MX 레코드 추가
3. 48시간 이내 자동 인증
4. `src/lib/email.ts`의 `from` 주소 수정

---

## 📚 자세한 가이드

전체 문서: [email_setup_guide.md](./email_setup_guide.md)
- 트러블슈팅
- 대안 서비스 (AWS SES, SendGrid)
- 비용 계산
- DNS 설정 상세

---

## 💡 자주 묻는 질문

**Q: 지금 당장 이메일을 받아볼 수 있나요?**
A: 개발 환경에서는 콘솔에만 출력됩니다. 실제 발송은 `NODE_ENV=production`일 때만 작동합니다.

**Q: 무료인가요?**
A: 네, Resend는 월 3,000통까지 무료입니다.

**Q: 도메인 인증이 필수인가요?**
A: 아니요. `noreply@resend.dev`로도 발송 가능합니다. 하지만 브랜드 신뢰도를 위해 자체 도메인 권장.

**Q: 스팸함으로 가지 않나요?**
A: Resend는 SPF/DKIM을 자동 설정하므로 도달률이 높습니다. 도메인 인증 시 더 좋습니다.

---

## 🎯 다음 단계

1. **지금 (개발):** 콘솔로 테스트
2. **나중 (배포 전):** Resend 설정
3. **선택 사항:** 도메인 인증
