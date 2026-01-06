# 크롤링 서버

별도 서버에서 Puppeteer를 사용하여 네이버 뉴스를 크롤링합니다.

## 배포 방법

### Railway (권장)
1. Railway에 새 프로젝트 생성
2. GitHub 저장소 연결
3. 루트 디렉토리를 `crawler-server`로 설정
4. 환경 변수 설정:
   - `PORT=3001` (또는 Railway가 자동 할당)
5. 배포

### Render
1. Render에 새 Web Service 생성
2. GitHub 저장소 연결
3. 루트 디렉토리: `crawler-server`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. 환경 변수 설정

## 로컬 실행

```bash
cd crawler-server
npm install
npm run dev
```

## API 엔드포인트

### POST /api/crawl/naver-news

네이버 뉴스를 크롤링합니다.

**응답:**
```json
{
  "articles": [
    {
      "title": "기사 제목",
      "content": "기사 요약",
      "link": "https://...",
      "sourceSite": "네이버 뉴스"
    }
  ]
}
```

## Vercel 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 추가하세요:

```
CRAWLER_SERVER_URL=https://your-crawler-server.railway.app
```
