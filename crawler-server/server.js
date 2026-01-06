const express = require('express')
const cors = require('cors')
const puppeteer = require('puppeteer')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// 대기 헬퍼 함수
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 네이버 뉴스 크롤링 함수
async function crawlNaverNews() {
  let browser
  try {
    console.log('[크롤링] 네이버 뉴스 크롤링 시작')
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1920, height: 1080 })
    
    // 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    })
    
    const url = "https://search.naver.com/search.naver?ssc=tab.news.all&where=news&sm=tab_jum&query=AI"
    console.log('[크롤링] 네이버 뉴스 검색 페이지 접속 중...')
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    })
    
    // 추가 대기 시간
    await wait(3000)
    
    // 페이지 로딩 대기
    console.log('[크롤링] 페이지 로딩 대기 중...')
    try {
      await page.waitForSelector('span.sds-comps-text-type-headline1', { timeout: 20000 })
      console.log('[크롤링] 페이지 로딩 완료')
    } catch (e) {
      console.error('[크롤링] 셀렉터를 찾을 수 없습니다.')
      return []
    }
    
    // 스크롤하여 추가 기사 로딩
    console.log('[크롤링] 스크롤하여 추가 기사 로딩 중...')
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await wait(1000)
      await wait(500)
    }
    
    // 기사 정보 추출
    console.log('[크롤링] 기사 수집 중...')
    
    const articles = await page.evaluate(() => {
      const titleElements = document.querySelectorAll('span.sds-comps-text-type-headline1')
      
      const results = []
      const seenLinks = new Set()
      
      titleElements.forEach((titleSpan) => {
        try {
          const title = titleSpan.textContent?.trim() || ''
          if (!title) return
          
          // 제목을 감싸는 가장 가까운 a 태그 찾기
          let aTag = null
          let current = titleSpan
          
          while (current && !aTag) {
            if (current.tagName === 'A') {
              aTag = current
              break
            }
            current = current.parentElement
          }
          
          if (!aTag || !aTag.href) return
          
          const link = aTag.href
          if (seenLinks.has(link)) return
          seenLinks.add(link)
          
          // 요약 추출
          let content = ""
          try {
            let cardContainer = null
            current = aTag
            
            while (current && !cardContainer) {
              if (current.tagName === 'DIV' && current.className && typeof current.className === 'string' && current.className.includes('sds-comps-base-layout')) {
                cardContainer = current
                break
              }
              current = current.parentElement
            }
            
            if (cardContainer) {
              const bodySpan = cardContainer.querySelector('span.sds-comps-text-type-body1')
              if (bodySpan) {
                content = bodySpan.textContent?.trim() || ''
              }
            }
          } catch (e) {
            content = ""
          }
          
          results.push({
            title,
            content,
            link,
          })
        } catch (e) {
          // 개별 기사 파싱 실패 시 continue
        }
      })
      
      return results
    })
    
    console.log(`[크롤링] 네이버 뉴스 ${articles.length}개 기사 수집`)
    
    // 상위 20개만 반환
    return articles.slice(0, 20).map((article) => ({
      title: article.title,
      content: article.content,
      sourceUrl: article.link,
      sourceSite: '네이버 뉴스',
      imageUrl: undefined,
      publishedAt: new Date().toISOString(),
    }))
  } catch (error) {
    console.error('[크롤링] 네이버 뉴스 크롤링 오류:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// 크롤링 API
app.post('/api/crawl/naver-news', async (req, res) => {
  try {
    console.log('[API] 크롤링 요청 받음')
    const articles = await crawlNaverNews()
    
    res.json({
      success: true,
      articles: articles,
    })
  } catch (error) {
    console.error('[API] 크롤링 오류:', error)
    res.status(500).json({
      success: false,
      error: error.message || '크롤링 중 오류가 발생했습니다.',
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`크롤링 서버가 포트 ${PORT}에서 실행 중입니다.`)
})
