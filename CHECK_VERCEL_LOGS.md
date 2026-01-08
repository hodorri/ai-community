# Vercel Functions 로그 확인 가이드

## 방법 1: Vercel 대시보드에서 로그 확인

### 1단계: API 호출하기 (로그 생성을 위해)
1. **배포된 사이트**에서 회원가입을 시도
   - 이렇게 하면 `/api/signup-profile`가 호출되고 로그가 생성됩니다

### 2단계: Vercel 대시보드에서 로그 확인
1. **Vercel 대시보드** 접속
2. 프로젝트 선택 (ai-comm)
3. **Deployments** 탭
4. 가장 최근 배포 선택
5. 상단 탭에서 **"Logs"** 클릭 ⬅️ 이게 중요!
6. 또는 상단 탭에서 **"Functions"** 클릭
   - `/api/signup-profile` 찾기
   - 클릭해서 상세 보기
   - **"Logs"** 탭 확인

### 3단계: 로그에서 확인할 내용
로그에서 다음을 찾으세요:
```
[API] 환경 변수 확인: {
  hasUrl: true/false,
  hasServiceKey: true/false,  ← 이것이 false면 환경 변수가 로드되지 않은 것!
  ...
}
```

## 방법 2: 브라우저 콘솔에서 확인 (더 쉬움!)

제가 코드를 수정했으므로, 이제 **브라우저 콘솔**에서도 환경 변수 상태를 확인할 수 있습니다!

### 단계:
1. **배포된 사이트**에서 회원가입 시도
2. **브라우저 개발자 도구 열기** (F12)
3. **Console** 탭 확인
4. 에러 메시지를 클릭해서 자세히 보기

에러 응답 예시:
```json
{
  "error": "서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
  "details": "...",
  "envCheck": {
    "hasUrl": true,
    "hasServiceKey": false,  ← 이것이 false면 환경 변수가 로드되지 않은 것!
    "urlLength": 50,
    "serviceKeyLength": 0,   ← 0이면 환경 변수가 없음!
    ...
  }
}
```

## 방법 3: 실제 API 응답 확인

브라우저 개발자 도구에서:
1. **Network** 탭 열기
2. 회원가입 시도
3. `/api/signup-profile` 요청 찾기
4. 클릭 → **Response** 탭 확인

여기서 실제 에러 응답과 `envCheck` 정보를 볼 수 있습니다!

## 문제 해결

### hasServiceKey가 false인 경우:
1. **Vercel 대시보드** > **Settings** > **Environment Variables** 확인
2. `SUPABASE_SERVICE_ROLE_KEY`가 있는지 확인
3. **모든 환경**(Production, Preview, Development)에 추가했는지 확인
4. 환경 변수 추가 후 **반드시 재배포**!

### serviceKeyLength가 0인 경우:
- 환경 변수 값이 비어있거나 설정되지 않은 것입니다
- 다시 추가하고 재배포하세요
