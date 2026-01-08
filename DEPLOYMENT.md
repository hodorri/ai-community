# 배포 가이드

## 배포 전 체크리스트

### 1. 빌드 테스트
```bash
npm run build
```
빌드가 성공적으로 완료되는지 확인하세요.

### 2. 환경 변수 확인
다음 환경 변수들이 설정되어 있는지 확인하세요:
- `NEXT_PUBLIC_SUPABASE_URL` (필수)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (필수)
- `SUPABASE_SERVICE_ROLE_KEY` (필수 - 회원가입 프로필 저장용)
- `NEXT_PUBLIC_ADMIN_EMAIL` (관리자 이메일)
- `RESEND_API_KEY` (이메일 발송용, 선택사항)

⚠️ **중요**: `SUPABASE_SERVICE_ROLE_KEY`는 회원가입 시 프로필 저장을 위해 필수입니다. 
이 키는 Supabase 대시보드 > Settings > API에서 확인할 수 있습니다.

## Vercel 배포 (권장)

### 방법 1: Vercel CLI 사용

1. **Vercel CLI 설치**
```bash
npm i -g vercel
```

2. **Vercel 로그인**
```bash
vercel login
```

3. **프로젝트 배포**
```bash
vercel
```

4. **프로덕션 배포**
```bash
vercel --prod
```

### 방법 2: Vercel 웹 대시보드 사용

1. **GitHub에 코드 푸시**
```bash
git add .
git commit -m "배포 준비"
git push origin main
```

2. **Vercel 대시보드에서 배포**
   - [https://vercel.com](https://vercel.com) 접속
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 import

3. **환경 변수 설정**
   - Project Settings > Environment Variables에서 다음 변수 추가:
     - `NEXT_PUBLIC_SUPABASE_URL` (필수)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (필수)
     - `SUPABASE_SERVICE_ROLE_KEY` (필수 - 회원가입 프로필 저장용)
     - `NEXT_PUBLIC_ADMIN_EMAIL`
     - `RESEND_API_KEY` (이메일 발송 사용 시)
   
   ⚠️ **각 환경(Production, Preview, Development)에 대해 변수를 모두 추가해야 합니다.**

4. **배포 설정**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. **배포 실행**
   - "Deploy" 버튼 클릭

## 배포 후 확인사항

1. **환경 변수 확인**
   - 배포된 사이트에서 환경 변수가 제대로 로드되는지 확인

2. **기능 테스트**
   - 로그인/회원가입
   - 게시글 작성/수정/삭제
   - 이미지 업로드
   - 댓글 작성/수정/삭제
   - 좋아요 기능

3. **에러 모니터링**
   - Vercel 대시보드의 Functions 로그 확인
   - 브라우저 콘솔 오류 확인

## 다른 배포 플랫폼

### Netlify
1. GitHub 저장소 연결
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. 환경 변수 설정

### 자체 서버 (Node.js)
```bash
npm run build
npm start
```

## 문제 해결

### 빌드 오류
- `npm run build`로 로컬에서 먼저 테스트
- 타입 오류나 린트 오류 수정

### 환경 변수 오류
- Vercel 대시보드에서 환경 변수 재확인
- 변수 이름에 오타가 없는지 확인

### 이미지 로드 오류
- `next.config.mjs`의 `remotePatterns` 확인
- 필요한 호스트명 추가
