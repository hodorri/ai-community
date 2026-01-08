# 이메일 발송 문제 디버깅 가이드

## 메일이 안 오는 경우 확인 사항

### 1. Vercel Functions 로그 확인

**Vercel 대시보드에서:**
1. Deployments > 최근 배포 선택
2. Functions 탭 > `/api/notify-admin` 선택
3. Logs 탭에서 다음을 확인:

#### 정상적인 경우:
```
[이메일 알림] Resend API 호출 시작: { to: '...', ... }
[이메일 알림] Resend API 응답 상태: 200 OK
[이메일 알림] 이메일 발송 성공: { id: '...' }
```

#### 환경 변수 문제:
```
[이메일 알림] RESEND_API_KEY가 설정되지 않았습니다.
또는
[이메일 알림] NEXT_PUBLIC_ADMIN_EMAIL이 설정되지 않았습니다.
```

#### Resend API 오류:
```
[이메일 알림] Resend API 응답 상태: 401 Unauthorized
또는
[이메일 알림] Resend API 오류: { message: '...' }
```

### 2. 브라우저 콘솔 확인

회원가입 시도 후 브라우저 개발자 도구(F12) > Console 탭에서:

#### 정상:
```
[회원가입] 관리자 알림 발송 시도
[회원가입] 관리자 알림 발송 성공
```

#### 실패:
```
[회원가입] 관리자 알림 발송 실패: { error: '...', ... }
```

### 3. 환경 변수 확인

**Vercel 대시보드에서:**
1. Settings > Environment Variables
2. 다음 변수들이 **모든 환경**에 설정되어 있는지 확인:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMIN_EMAIL=your-admin@email.com
```

**확인 사항:**
- [ ] 변수 이름이 정확한가? (대소문자 구분)
- [ ] 모든 환경(Production, Preview, Development)에 추가했는가?
- [ ] 값에 공백이나 따옴표가 포함되지 않았는가?
- [ ] 환경 변수 추가 후 재배포를 했는가?

### 4. Resend.com 대시보드 확인

1. **Resend.com 로그인**
   - https://resend.com 접속
   - 대시보드 > Logs 탭

2. **확인 사항:**
   - 이메일 발송 내역이 있는가?
   - 실패한 이메일이 있다면 에러 메시지 확인
   - API 키가 활성화되어 있는가?

3. **API 키 확인:**
   - API Keys 탭
   - 사용 중인 키가 활성화되어 있는지 확인
   - 키가 삭제되거나 비활성화되지 않았는지 확인

### 5. 스팸함 확인

- 관리자 이메일의 **스팸함**도 확인하세요
- `onboarding@resend.dev`에서 발송되므로 스팸으로 분류될 수 있습니다

## 일반적인 문제와 해결 방법

### 문제 1: "RESEND_API_KEY가 설정되지 않았습니다"

**해결:**
1. Vercel > Environment Variables에서 `RESEND_API_KEY` 추가
2. Resend.com에서 API 키 발급
3. 재배포

### 문제 2: "NEXT_PUBLIC_ADMIN_EMAIL이 설정되지 않았습니다"

**해결:**
1. Vercel > Environment Variables에서 `NEXT_PUBLIC_ADMIN_EMAIL` 추가
2. 관리자 이메일 주소 입력
3. 재배포

### 문제 3: "401 Unauthorized" (Resend API 오류)

**원인:**
- API 키가 잘못되었거나 만료됨
- API 키에 권한이 없음

**해결:**
1. Resend.com에서 새 API 키 발급
2. Vercel에서 환경 변수 업데이트
3. 재배포

### 문제 4: 이메일은 발송되었지만 도착하지 않음

**확인:**
1. Resend.com Logs에서 발송 내역 확인
2. 관리자 이메일의 스팸함 확인
3. 이메일 주소 오타 확인

## 테스트 방법

### 1. 직접 API 테스트

Vercel Functions에서 직접 테스트:
1. Functions > `/api/notify-admin` > Test 탭
2. 다음 JSON으로 POST 요청:

```json
{
  "userEmail": "test@example.com",
  "userName": "테스트 사용자",
  "employeeNumber": "12345",
  "company": "테스트 회사",
  "team": "테스트 팀",
  "position": "테스트 직급"
}
```

### 2. 회원가입 테스트

1. 배포된 사이트에서 실제 회원가입 시도
2. 브라우저 콘솔 확인
3. Vercel Functions 로그 확인
4. Resend.com Logs 확인

## 로그 예시

### 성공 케이스:
```
[이메일 알림] Resend API 호출 시작: { to: 'admin@example.com', ... }
[이메일 알림] Resend API 응답 상태: 200 OK
[이메일 알림] Resend API 응답 본문: {"id":"..."}
[이메일 알림] 이메일 발송 성공: { id: '...' }
```

### 실패 케이스 1 (환경 변수 없음):
```
[이메일 알림] RESEND_API_KEY가 설정되지 않았습니다.
[이메일 알림] 새 사용자 가입: user@example.com
[이메일 알림] 관리자 승인 필요: admin@example.com
```

### 실패 케이스 2 (Resend API 오류):
```
[이메일 알림] Resend API 호출 시작: { ... }
[이메일 알림] Resend API 응답 상태: 401 Unauthorized
[이메일 알림] Resend API 응답 본문: {"message":"Invalid API key"}
[이메일 알림] Resend API 오류: { message: 'Invalid API key' }
```
