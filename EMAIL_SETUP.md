# 관리자 알림 이메일 설정 가이드

## 문제
회원가입 시 관리자에게 이메일 알림이 발송되지 않습니다.

## 원인
`RESEND_API_KEY` 환경 변수가 설정되지 않았거나, `NEXT_PUBLIC_ADMIN_EMAIL`이 설정되지 않았을 수 있습니다.

## 해결 방법

### 1단계: Resend.com 계정 생성 및 API 키 발급

1. **Resend.com 가입**
   - https://resend.com 접속
   - 무료 계정 생성 (월 3,000통 무료)

2. **API 키 발급**
   - Resend 대시보드 > API Keys
   - "Create API Key" 클릭
   - 키 이름 입력 (예: "ai-comm-production")
   - 권한: "Sending access" 선택
   - "Create" 클릭
   - **API 키 복사** (나중에 다시 볼 수 없으므로 저장!)

3. **도메인 설정 (선택사항)**
   - 기본적으로 `onboarding@resend.dev`에서 발송됩니다
   - 자체 도메인을 사용하려면 도메인을 추가하고 DNS 설정해야 합니다
   - 현재는 `onboarding@resend.dev` 사용으로도 충분합니다

### 2단계: Vercel 환경 변수 설정

1. **Vercel 대시보드 접속**
   - https://vercel.com
   - 프로젝트 선택 (`ai-comm`)

2. **Environment Variables 설정**
   - Settings > Environment Variables
   - 다음 변수들을 **모든 환경**(Production, Preview, Development)에 추가:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMIN_EMAIL=your-admin@email.com
```

**중요**: 
- `RESEND_API_KEY`: Resend.com에서 발급받은 API 키
- `NEXT_PUBLIC_ADMIN_EMAIL`: 관리자 이메일 주소 (알림을 받을 이메일)
- 모든 환경에 추가해야 합니다!

3. **재배포**
   - 환경 변수 저장 후 자동으로 재배포됩니다
   - 또는 수동으로 Deployments > Redeploy 클릭

### 3단계: 테스트

1. **회원가입 테스트**
   - 배포된 사이트에서 새 계정으로 회원가입
   - 관리자 이메일로 알림이 도착하는지 확인

2. **로그 확인**
   - Vercel Functions > `/api/notify-admin` > Logs
   - 에러가 없는지 확인

## 확인 사항

### 환경 변수가 제대로 설정되었는지 확인

Vercel Functions 로그에서 다음을 확인:
- `RESEND_API_KEY`가 없으면: "RESEND_API_KEY가 설정되지 않았습니다" 에러
- `NEXT_PUBLIC_ADMIN_EMAIL`이 없으면: "NEXT_PUBLIC_ADMIN_EMAIL이 설정되지 않았습니다" 에러

### Resend API 상태 확인

Resend 대시보드에서:
- API Keys > 사용 중인 키가 활성화되어 있는지 확인
- Logs 탭에서 이메일 발송 내역 확인

## 문제 해결

### 여전히 이메일이 오지 않는 경우

1. **Vercel Functions 로그 확인**
   - `/api/notify-admin` API 호출 로그 확인
   - 에러 메시지 확인

2. **Resend 대시보드 확인**
   - Logs 탭에서 이메일 발송 내역 확인
   - 실패한 이메일이 있다면 에러 메시지 확인

3. **스팸함 확인**
   - 관리자 이메일의 스팸함도 확인

4. **환경 변수 재확인**
   - Vercel 대시보드에서 환경 변수가 제대로 설정되었는지 확인
   - 오타가 없는지 확인
   - 재배포를 했는지 확인

## 추가 정보

### 현재 이메일 발송 서비스
- **서비스**: Resend.com
- **발신 주소**: `onboarding@resend.dev` (기본)
- **발신 주소 변경**: Resend에서 자체 도메인을 추가하여 변경 가능

### 비용
- Resend 무료 플랜: 월 3,000통 무료
- 월 100명 가입 기준: 충분히 무료 플랜으로 사용 가능
