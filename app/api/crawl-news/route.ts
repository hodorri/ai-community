import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface CrawledNewsItem {
  title: string
  content: string
  sourceUrl: string
  sourceSite: string
  authorName?: string
  imageUrl?: string
  publishedAt?: string
}

// 외부 크롤링 서버 호출 (별도 서버 구축 시)
async function crawlNaverNewsFromExternalServer(): Promise<CrawledNewsItem[]> {
  const CRAWLER_SERVER_URL = process.env.CRAWLER_SERVER_URL
  
  if (!CRAWLER_SERVER_URL) {
    console.error('[크롤링] CRAWLER_SERVER_URL이 설정되지 않았습니다.')
    throw new Error('크롤링 서버가 설정되지 않았습니다. 환경 변수를 확인해주세요.')
  }

  try {
    console.log('[크롤링] 외부 크롤링 서버 호출:', CRAWLER_SERVER_URL)
    
    const response = await fetch(`${CRAWLER_SERVER_URL}/api/crawl/naver-news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 타임아웃 설정 (2분)
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`크롤링 서버 오류: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.articles || []
  } catch (error: any) {
    console.error('[크롤링] 외부 서버 호출 오류:', error)
    
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      throw new Error('크롤링 서버 응답 시간이 초과되었습니다.')
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      throw new Error('크롤링 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.')
    }
    
    throw error
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

    // 외부 크롤링 서버 호출
    const naverNews = await crawlNaverNewsFromExternalServer()

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
    } else if (errorDetails.includes('ECONNREFUSED') || errorDetails.includes('ENOTFOUND')) {
      errorMessage = '크롤링 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.'
    } else if (errorDetails.includes('CRAWLER_SERVER_URL')) {
      errorMessage = '크롤링 서버가 설정되지 않았습니다. 관리자에게 문의해주세요.'
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
