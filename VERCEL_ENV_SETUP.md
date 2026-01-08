# Vercel 환경 변수 설정 및 재배포 가이드

## ⚠️ 중요: 환경 변수 추가 후 반드시 재배포 필요!

Next.js는 **빌드 타임**에 환경 변수를 포함시키므로, 환경 변수를 추가한 후 **반드시 재배포**해야 합니다!

## 1단계: 환경 변수 추가

### Vercel 대시보드에서:

1. **프로젝트 선택** → **Settings** → **Environment Variables**

2. 다음 환경 변수를 **모든 환경(Production, Preview, Development)**에 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  ⚠️ 필수!
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email
RESEND_API_KEY=your_resend_api_key (선택사항)
```

3. **변수 이름 확인**:
   - `SUPABASE_SERVICE_ROLE_KEY` (대소문자 정확히)
   - 오타가 없어야 합니다!

## 2단계: 재배포 (필수!)

### 방법 1: 자동 재배포 (환경 변수 저장 시)
- 환경 변수를 추가하고 저장하면 **자동으로 재배포가 트리거**됩니다
- 하지만 때때로 자동 재배포가 안 될 수 있으므로 방법 2를 권장합니다

### 방법 2: 수동 재배포 (권장)

**Vercel 대시보드에서:**
1. **Deployments** 탭으로 이동
2. 가장 최근 배포를 선택
3. 우측 상단의 **"Redeploy"** 버튼 클릭
4. "Use existing Build Cache" 옵션은 **체크 해제** (환경 변수 포함을 위해)
5. **"Redeploy"** 클릭

**또는 Vercel CLI에서:**
```bash
vercel --prod --force
```

**또는 Git 푸시:**
```bash
git commit --allow-empty -m "트리거: 환경 변수 재배포"
git push origin main
```

## 3단계: 배포 확인

### 1. 배포 상태 확인
- Vercel 대시보드 > Deployments에서 배포가 완료될 때까지 대기
- 빌드 로그에서 에러가 없는지 확인

### 2. 환경 변수 확인 (디버깅용)

실제 배포된 사이트에서 API를 호출하면, 에러 응답에 환경 변수 상태가 포함됩니다:

```json
{
  "error": "...",
  "envCheck": {
    "hasUrl": true/false,
    "hasServiceKey": true/false,
    ...
  }
}
```

### 3. Vercel Functions 로그 확인

**Vercel 대시보드에서:**
1. **Deployments** → 최근 배포 선택
2. **Functions** 탭 클릭
3. `/api/signup-profile` 선택
4. **Logs** 탭에서 로그 확인

**로그에서 확인할 내용:**
```
[API] 환경 변수 확인: {
  hasUrl: true,
  hasServiceKey: true,  ← 이것이 false이면 환경 변수가 로드되지 않은 것
  ...
}
```

## 문제 해결

### 문제 1: 여전히 500 에러가 발생

**체크리스트:**
- [ ] 환경 변수 이름이 정확한가? (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] 모든 환경(Production, Preview, Development)에 추가했는가?
- [ ] 환경 변수 추가 후 **재배포**를 했는가?
- [ ] Vercel Functions 로그에서 환경 변수 상태 확인

**해결:**
1. Vercel 대시보드 > Environment Variables에서 다시 확인
2. 환경 변수 삭제 후 다시 추가
3. **반드시 재배포** (Redeploy 버튼 클릭)

### 문제 2: 환경 변수가 로드되지 않음

**원인:**
- 환경 변수를 추가했지만 재배포를 하지 않았을 가능성

**해결:**
1. Vercel 대시보드 > Deployments에서 **Redeploy** 클릭
2. "Use existing Build Cache" 옵션 **체크 해제**
3. 재배포 완료 후 다시 테스트

### 문제 3: Vercel Functions 로그 확인 방법

1. **Vercel 대시보드** 로그인
2. 프로젝트 선택
3. **Deployments** 탭
4. 최근 배포 선택
5. **Functions** 탭
6. `/api/signup-profile` 선택
7. **Logs** 탭에서 로그 확인

로그 예시:
```
[API] 환경 변수 확인: { hasUrl: true, hasServiceKey: true, ... }
[API] 프로필 저장 요청: { userId: '...', email: '...' }
```

## 현재 에러 메시지 확인

회원가입을 시도하면 브라우저 콘솔에 더 자세한 에러 메시지가 표시됩니다:

```
프로필 저장에 실패했습니다: ...
💡 [힌트 메시지]
에러 코드: [코드]
```

이 메시지를 통해 문제를 진단할 수 있습니다.
