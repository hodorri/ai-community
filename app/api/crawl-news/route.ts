import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer'

export interface CrawledNewsItem {
  title: string
  content: string
  sourceUrl: string
  sourceSite: string
  authorName?: string
  imageUrl?: string
  publishedAt?: string
}

// 대기 헬퍼 함수
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 네이버 뉴스 크롤링 함수
async function crawlNaverNews(): Promise<CrawledNewsItem[]> {
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
    
    // User-Agent 설정 (일반 브라우저처럼 보이게)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1920, height: 1080 })
    
    // 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    })
    
    const url = "https://search.naver.com/search.naver?ssc=tab.news.all&where=news&sm=tab_jum&query=AI"
    console.log('[크롤링] 네이버 뉴스 검색 페이지 접속 중...')
    
    // 페이지 로드 (더 긴 타임아웃)
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      })
    } catch (gotoError: any) {
      console.error('[크롤링] 페이지 로드 실패:', gotoError.message)
      if (gotoError.message.includes('timeout') || gotoError.message.includes('Navigation timeout')) {
        throw new Error('페이지 로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.')
      } else if (gotoError.message.includes('net::')) {
        throw new Error('네트워크 연결 오류가 발생했습니다.')
      }
      throw gotoError
    }
    
    // 추가 대기 시간 (JavaScript 실행 대기)
    await wait(3000)
    
    // 페이지 로딩 대기 (더 긴 타임아웃)
    console.log('[크롤링] 페이지 로딩 대기 중...')
    try {
      // 여러 셀렉터 시도
      await page.waitForSelector('span.sds-comps-text-type-headline1', { timeout: 20000 })
      console.log('[크롤링] 페이지 로딩 완료')
    } catch (e) {
      console.error('[크롤링] 셀렉터를 찾을 수 없습니다. 대체 셀렉터 시도 중...')
      // 대체 셀렉터 시도
      try {
        await page.waitForSelector('a.news_tit, .news_tit, [class*="news"]', { timeout: 5000 })
        console.log('[크롤링] 대체 셀렉터로 페이지 발견')
      } catch (e2) {
        console.error('[크롤링] 모든 셀렉터 실패:', e2)
        // 페이지 스크린샷 저장 (디버깅용)
        const screenshot = await page.screenshot({ encoding: 'base64' })
        console.log('[크롤링] 스크린샷 길이:', screenshot ? screenshot.length : 0)
        return []
      }
    }
    
    // 무한 스크롤 로딩 (5번 반복, 1초 대기)
    console.log('[크롤링] 스크롤하여 추가 기사 로딩 중...')
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await wait(1000) // 0.5초 -> 1초로 증가
      console.log(`[크롤링] 스크롤 ${i+1}/5 완료`)
      
      // 스크롤 후 추가 대기 (동적 콘텐츠 로딩 대기)
      await wait(500)
    }
    
    // 기사 정보 추출 (Python 코드와 동일한 로직)
    console.log('[크롤링] 기사 수집 중...')
    
    // 먼저 요소 개수 확인
    const titleCount = await page.evaluate(() => {
      return document.querySelectorAll('span.sds-comps-text-type-headline1').length
    })
    console.log(`[크롤링] 발견된 제목 요소 개수: ${titleCount}`)
    
    if (titleCount === 0) {
      console.log('[크롤링] 제목 요소를 찾을 수 없습니다. 페이지 구조 확인 중...')
      const pageTitle = await page.title()
      console.log('[크롤링] 페이지 제목:', pageTitle)
      const currentUrl = page.url()
      console.log('[크롤링] 현재 URL:', currentUrl)
      
      // 페이지 내용 일부 확인
      const bodyText = await page.evaluate(() => document.body.innerText)
      console.log('[크롤링] 페이지 본문 길이:', bodyText.length)
      console.log('[크롤링] 페이지 본문 일부:', bodyText.substring(0, 500))
      
      // 다른 가능한 셀렉터 확인
      const altSelectors = await page.evaluate(() => {
        return {
          newsTit: document.querySelectorAll('a.news_tit').length,
          newsWrap: document.querySelectorAll('.news_wrap').length,
          newsArea: document.querySelectorAll('.news_area').length,
          headline1: document.querySelectorAll('span.sds-comps-text-type-headline1').length,
          allLinks: document.querySelectorAll('a[href*="news.naver.com"]').length,
        }
      })
      console.log('[크롤링] 대체 셀렉터 결과:', altSelectors)
      
      return []
    }
    
    const articles = await page.evaluate(() => {
      const titleElements = document.querySelectorAll('span.sds-comps-text-type-headline1')
      
      const results: Array<{
        title: string
        content: string
        link: string
      }> = []
      const seenLinks = new Set<string>()
      
      titleElements.forEach((titleSpan, idx) => {
        try {
          // 제목 추출
          const title = titleSpan.textContent?.trim() || ''
          if (!title) return
          
          // 제목을 감싸는 가장 가까운 a 태그 찾기 (XPath 대신 DOM 순회)
          let aTag: HTMLAnchorElement | null = null
          let current: HTMLElement | null = titleSpan as HTMLElement
          
          // ancestor::a[1] 구현
          while (current && !aTag) {
            if (current.tagName === 'A') {
              aTag = current as HTMLAnchorElement
              break
            }
            current = current.parentElement
          }
          
          // 대안: data-heatmap-target=".tit" 속성을 가진 a 태그 찾기
          if (!aTag || !aTag.href) {
            current = titleSpan as HTMLElement
            while (current && !aTag) {
              if (current.tagName === 'A' && current.getAttribute('data-heatmap-target') === '.tit') {
                aTag = current as HTMLAnchorElement
                break
              }
              current = current.parentElement
            }
          }
          
          if (!aTag || !aTag.href) return
          
          const link = aTag.href
          if (seenLinks.has(link)) return
          seenLinks.add(link)
          
          // 요약 추출 (같은 카드 내에서)
          let content = ""
          try {
            // 카드 컨테이너 찾기: ./ancestor::div[contains(@class,'sds-comps-base-layout')][1]
            let cardContainer: HTMLElement | null = null
            current = aTag
            
            // ancestor::div[contains(@class,'sds-comps-base-layout')][1] 구현
            while (current && !cardContainer) {
              if (current.tagName === 'DIV' && current.className && typeof current.className === 'string' && current.className.includes('sds-comps-base-layout')) {
                cardContainer = current
                break
              }
              current = current.parentElement
            }
            
            // 한 단계 더 올라가서 재시도
            if (!cardContainer) {
              const parent = aTag.parentElement
              if (parent) {
                current = parent
                while (current && !cardContainer) {
                  if (current.tagName === 'DIV' && current.className && typeof current.className === 'string' && current.className.includes('sds-comps-base-layout')) {
                    cardContainer = current
                    break
                  }
                  current = current.parentElement
                }
              }
            }
            
            if (cardContainer) {
              // 카드 내에서 body1 span 찾기
              const bodySpan = cardContainer.querySelector('span.sds-comps-text-type-body1')
              if (bodySpan) {
                content = bodySpan.textContent?.trim() || ''
              }
            }
          } catch (e) {
            // 요약이 없으면 빈 문자열로 둠
            content = ""
          }
          
          // 기사 정보 저장
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
    
    if (articles.length === 0) {
      console.log('[크롤링] 기사가 수집되지 않았습니다. 페이지 구조를 확인합니다...')
      // 디버깅: 페이지 스크린샷 또는 HTML 일부 확인
      const pageContent = await page.content()
      console.log('[크롤링] 페이지 HTML 길이:', pageContent.length)
      const hasHeadline = pageContent.includes('sds-comps-text-type-headline1')
      console.log('[크롤링] headline1 클래스 존재:', hasHeadline)
    }
    
    // 상위 20개만 반환
    return articles.slice(0, 20).map((article) => ({
      title: article.title,
      content: article.content,
      sourceUrl: article.link,
      sourceSite: '네이버 뉴스',
      imageUrl: undefined,
      publishedAt: new Date().toISOString(),
    }))
  } catch (error: any) {
    console.error('[크롤링] 네이버 뉴스 크롤링 오류:', error)
    
    // 브라우저가 열려있으면 닫기
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('[크롤링] 브라우저 종료 오류:', closeError)
      }
    }
    
    // 에러 타입별 처리
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
      console.error('[크롤링] 타임아웃 오류')
    } else if (error?.message?.includes('net::') || error?.message?.includes('ECONNREFUSED')) {
      console.error('[크롤링] 네트워크 연결 오류')
    } else if (error?.message?.includes('Navigation failed')) {
      console.error('[크롤링] 페이지 네비게이션 실패')
    }
    
    return []
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('[크롤링] 브라우저 종료 오류:', closeError)
      }
    }
  }
}

// 크롤링만 수행하고 결과 반환 (저장하지 않음)
export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabase = await createClient()
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // 토큰으로 직접 사용자 확인
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
      } else {
        authError = tokenError
      }
    } else {
      // 쿠키에서 인증 정보 가져오기
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      user = cookieUser
      authError = cookieError
    }

    if (authError) {
      console.error('[크롤링] 인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('[크롤링] 사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('[크롤링] 현재 사용자:', user.email)

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (!ADMIN_EMAIL) {
      console.error('[크롤링] ADMIN_EMAIL이 설정되지 않았습니다.')
      return NextResponse.json({ error: '관리자 설정이 필요합니다.' }, { status: 500 })
    }

    if (user.email !== ADMIN_EMAIL) {
      console.log(`[크롤링] 관리자 권한 없음: ${user.email} !== ${ADMIN_EMAIL}`)
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    console.log('[크롤링] 시작')

    // 네이버 뉴스 크롤링
    const naverNews = await crawlNaverNews()

    console.log(`[크롤링] 총 ${naverNews.length}개 뉴스 수집`)

    // 중복 체크 (이미 저장된 기사인지 확인)
    const newsWithDuplicateCheck = await Promise.all(
      naverNews.map(async (item) => {
        const { data: existing } = await supabase
          .from('news')
          .select('id')
          .eq('source_url', item.sourceUrl)
          .maybeSingle()

        return {
          ...item,
          isDuplicate: !!existing,
        }
      })
    )

    return NextResponse.json({
      success: true,
      total: naverNews.length,
      news: newsWithDuplicateCheck,
    })
  } catch (error: any) {
    console.error('[크롤링] 오류:', error)
    
    // 에러 타입별 메시지 설정
    let errorMessage = '크롤링 중 오류가 발생했습니다.'
    let errorDetails = error?.message || String(error)
    
    if (errorDetails.includes('timeout') || errorDetails.includes('Timeout')) {
      errorMessage = '크롤링 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.'
    } else if (errorDetails.includes('net::') || errorDetails.includes('ECONNREFUSED') || errorDetails.includes('ENOTFOUND')) {
      errorMessage = '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'
    } else if (errorDetails.includes('Navigation failed') || errorDetails.includes('Navigation timeout')) {
      errorMessage = '페이지 접속에 실패했습니다. 잠시 후 다시 시도해주세요.'
    } else if (errorDetails.includes('Browser closed') || errorDetails.includes('Target closed')) {
      errorMessage = '브라우저 연결이 끊어졌습니다. 다시 시도해주세요.'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails 
      },
      { status: 500 }
    )
  }
}
