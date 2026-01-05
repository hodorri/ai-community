import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CrawledNewsItem {
  title: string
  content: string
  sourceUrl: string
  sourceSite: string
  authorName?: string
  imageUrl?: string
  publishedAt?: string
}

// 크롤링 함수 (실제 구현은 각 사이트 구조에 맞게 수정 필요)
async function crawlAitimesCom(): Promise<CrawledNewsItem[]> {
  try {
    // TODO: 실제 크롤링 로직 구현
    // Puppeteer나 Cheerio를 사용하여 크롤링
    // 현재는 예시 데이터 반환
    return []
  } catch (error) {
    console.error('AITimes.com 크롤링 오류:', error)
    return []
  }
}

async function crawlAitimesKr(): Promise<CrawledNewsItem[]> {
  try {
    // TODO: 실제 크롤링 로직 구현
    return []
  } catch (error) {
    console.error('AITimes.kr 크롤링 오류:', error)
    return []
  }
}

async function crawlKoraiaOrg(): Promise<CrawledNewsItem[]> {
  try {
    // TODO: 실제 크롤링 로직 구현
    return []
  } catch (error) {
    console.error('KorAI.org 크롤링 오류:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 관리자만 크롤링 실행 가능 (선택사항)
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    // if (user.email !== ADMIN_EMAIL) {
    //   return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    // }

    console.log('[크롤링] 시작')

    // 각 사이트에서 크롤링
    const [aitimesCom, aitimesKr, koraia] = await Promise.all([
      crawlAitimesCom(),
      crawlAitimesKr(),
      crawlKoraiaOrg(),
    ])

    const allNews = [
      ...aitimesCom.slice(0, 5),
      ...aitimesKr.slice(0, 5),
      ...koraia.slice(0, 5),
    ]

    console.log(`[크롤링] 총 ${allNews.length}개 뉴스 수집`)

    // 중복 체크 및 저장
    const savedNews = []
    for (const newsItem of allNews) {
      // source_url이 이미 존재하는지 확인
      const { data: existing } = await supabase
        .from('news')
        .select('id')
        .eq('source_url', newsItem.sourceUrl)
        .maybeSingle()

      if (!existing) {
        // 새로운 뉴스 저장
        const { data, error } = await supabase
          .from('news')
          .insert({
            title: newsItem.title,
            content: newsItem.content,
            source_url: newsItem.sourceUrl,
            source_site: newsItem.sourceSite,
            author_name: newsItem.authorName || null,
            image_url: newsItem.imageUrl || null,
            published_at: newsItem.publishedAt || new Date().toISOString(),
            is_manual: false,
          })
          .select()
          .single()

        if (!error && data) {
          savedNews.push(data)
        } else {
          console.error(`[크롤링] 뉴스 저장 실패:`, error)
        }
      }
    }

    console.log(`[크롤링] ${savedNews.length}개 뉴스 저장 완료`)

    return NextResponse.json({
      success: true,
      total: allNews.length,
      saved: savedNews.length,
      skipped: allNews.length - savedNews.length,
    })
  } catch (error) {
    console.error('[크롤링] 오류:', error)
    return NextResponse.json(
      { error: '크롤링 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
