# 회원가입 배포 오류 수정 가이드

## 발견된 문제점

1. **환경 변수 누락**: `SUPABASE_SERVICE_ROLE_KEY`가 배포 환경에 설정되지 않아 API 라우트에서 500 에러 발생
2. **406 에러**: 클라이언트에서 직접 Supabase 호출 시 RLS 정책 문제로 406 에러 발생
3. **에러 메시지 개선**: 사용자에게 더 명확한 에러 메시지 제공 필요

## 수정 내용

### 1. 환경 변수 문서 업데이트
- `VERCEL_DEPLOY.md`: `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 추가 안내
- `DEPLOYMENT.md`: 환경 변수 목록에 `SUPABASE_SERVICE_ROLE_KEY` 추가

### 2. 코드 개선
- `components/auth/SignupForm.tsx`: 
  - 에러 처리 개선 (406 에러 감지 및 힌트 제공)
  - API 라우트 실패 시 더 자세한 에러 메시지 표시
  - `.single()` 대신 `.maybeSingle()` 사용으로 에러 처리 개선

- `app/api/signup-profile/route.ts`:
  - 환경 변수 검증 강화
  - 더 자세한 로깅 추가
  - 에러 메시지에 힌트 추가

## 배포 전 필수 작업

### 1. Vercel 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 **반드시** 추가해야 합니다:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  ⚠️ 필수 추가!
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email
RESEND_API_KEY=your_resend_api_key (선택사항)
```

**중요**: 
- `SUPABASE_SERVICE_ROLE_KEY`는 **Production, Preview, Development 모두**에 추가해야 합니다
- 이 키는 Supabase 대시보드 > Settings > API에서 확인할 수 있습니다
- 서버 사이드에서만 사용되며, 클라이언트에 노출되면 안 됩니다

### 2. 환경 변수 확인 방법

Vercel 대시보드에서:
1. Project Settings > Environment Variables로 이동
2. 모든 환경(Production, Preview, Development)에 `SUPABASE_SERVICE_ROLE_KEY`가 있는지 확인
3. 없다면 추가 후 저장

### 3. 재배포

환경 변수를 추가한 후:

**방법 1: 자동 재배포**
- 환경 변수 저장 시 자동으로 재배포가 트리거됩니다

**방법 2: 수동 재배포**
```bash
git add .
git commit -m "회원가입 오류 수정: 환경 변수 문서 업데이트 및 에러 핸들링 개선"
git push origin main
```

Vercel은 GitHub 푸시 시 자동으로 재배포합니다.

**방법 3: Vercel 대시보드에서 재배포**
- Vercel 대시보드 > Deployments에서 "Redeploy" 클릭

## 배포 후 확인사항

1. ✅ 환경 변수가 제대로 설정되었는지 확인
   - Vercel Functions 로그에서 환경 변수 관련 에러가 없는지 확인

2. ✅ 회원가입 테스트
   - 실제 배포 사이트에서 회원가입 시도
   - 브라우저 콘솔에서 에러 확인
   - 프로필이 정상적으로 저장되는지 확인

3. ✅ 로그 확인
   - Vercel 대시보드 > Functions 탭에서 API 라우트 로그 확인
   - 에러가 발생하는 경우 상세한 로그가 출력됩니다

## 문제 해결

### 여전히 500 에러가 발생하는 경우
- Vercel 대시보드에서 환경 변수가 제대로 설정되었는지 확인
- 환경 변수 이름에 오타가 없는지 확인 (대소문자 구분)
- Vercel Functions 로그에서 에러 메시지 확인

### 406 에러가 계속 발생하는 경우
- API 라우트가 먼저 시도되므로, API 라우트가 성공하면 406 에러는 발생하지 않아야 합니다
- 406 에러가 계속 발생한다면 Supabase RLS 정책을 확인하세요

## 변경된 파일 목록

1. `VERCEL_DEPLOY.md` - 환경 변수 가이드 업데이트
2. `DEPLOYMENT.md` - 환경 변수 목록 업데이트
3. `components/auth/SignupForm.tsx` - 에러 처리 개선
4. `app/api/signup-profile/route.ts` - 로깅 및 에러 핸들링 강화
