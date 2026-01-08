# Vercel 배포 가이드

## 현재 상태
✅ Git 커밋 및 푸시 완료
✅ 코드가 GitHub에 업로드됨: https://github.com/hodorri/ai-community.git

## Vercel 웹 대시보드를 통한 배포 (권장)

### 1단계: Vercel 접속 및 로그인
1. [https://vercel.com](https://vercel.com) 접속
2. GitHub 계정으로 로그인

### 2단계: 프로젝트 Import
1. 대시보드에서 "Add New Project" 클릭
2. GitHub 저장소 목록에서 `ai-community` 선택
3. "Import" 클릭

### 3단계: 프로젝트 설정
- **Framework Preset**: Next.js (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Install Command**: `npm install` (기본값)

### 4단계: 환경 변수 설정 (중요!)
"Environment Variables" 섹션에서 다음 변수들을 추가하세요:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email
RESEND_API_KEY=your_resend_api_key (선택사항)
```

**각 환경(Production, Preview, Development)에 대해 변수를 추가해야 합니다.**

⚠️ **중요**: `SUPABASE_SERVICE_ROLE_KEY`는 회원가입 시 프로필 저장을 위해 필수입니다. 
이 키는 Supabase 대시보드 > Settings > API에서 확인할 수 있습니다. 
⚠️ **보안**: 이 키는 서버 사이드에서만 사용되며, 클라이언트에 노출되면 안 됩니다.

### 5단계: 배포 실행
1. "Deploy" 버튼 클릭
2. 배포 완료까지 대기 (약 2-3분)

### 6단계: 배포 확인
- 배포 완료 후 제공되는 URL로 접속
- 모든 기능이 정상 작동하는지 테스트

## Vercel CLI를 통한 배포 (선택사항)

CLI를 사용하려면 먼저 로그인이 필요합니다:

```bash
# 1. Vercel 로그인 (브라우저가 열림)
vercel login

# 2. 프로젝트 연결 (처음 한 번만)
vercel link

# 3. 프로덕션 배포
vercel --prod
```

## 배포 후 확인사항

1. ✅ 로그인/회원가입 기능
2. ✅ 게시글 작성/수정/삭제
3. ✅ 이미지 업로드
4. ✅ 댓글 작성/수정/삭제
5. ✅ 좋아요 기능
6. ✅ 최신 AI 소식 기능
7. ✅ AI CoP 기능

## 문제 해결

### 빌드 오류
- Vercel 대시보드의 "Deployments" 탭에서 로그 확인
- 환경 변수가 제대로 설정되었는지 확인

### 환경 변수 오류
- Settings > Environment Variables에서 재확인
- Production, Preview, Development 모두에 설정되어 있는지 확인

### 이미지 로드 오류
- `next.config.mjs`의 `remotePatterns` 확인
- 필요한 호스트명이 추가되어 있는지 확인
