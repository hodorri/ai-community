import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CrawledNewsItem } from '../route'

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
      console.error('[크롤링 저장] 인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('[크롤링 저장] 사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { newsItems }: { newsItems: CrawledNewsItem[] } = body

    if (!newsItems || !Array.isArray(newsItems)) {
      return NextResponse.json({ error: '뉴스 항목이 필요합니다.' }, { status: 400 })
    }

    console.log(`[크롤링 저장] ${newsItems.length}개 뉴스 저장 시작`)
    console.log('[크롤링 저장] 저장할 뉴스 항목:', JSON.stringify(newsItems, null, 2))

    // 선택한 뉴스 저장
    const savedNews = []
    const errors: Array<{ item: CrawledNewsItem; error: any }> = []
    
    for (const newsItem of newsItems) {
      try {
        console.log(`[크롤링 저장] 처리 중: ${newsItem.title}`)
        
        // 중복 체크
        const { data: existing, error: checkError } = await supabase
          .from('news')
          .select('id')
          .eq('source_url', newsItem.sourceUrl)
          .maybeSingle()

        if (checkError) {
          console.error(`[크롤링 저장] 중복 체크 오류:`, checkError)
          errors.push({ item: newsItem, error: checkError })
          continue
        }

        if (existing) {
          console.log(`[크롤링 저장] 중복 항목 건너뜀: ${newsItem.title} (ID: ${existing.id})`)
          continue
        }

        // 새로운 뉴스 저장
        const insertData = {
          title: newsItem.title,
          content: newsItem.content || '', // 빈 문자열이어도 허용
          source_url: newsItem.sourceUrl,
          source_site: newsItem.sourceSite || '네이버 뉴스',
          author_name: newsItem.authorName || null,
          image_url: newsItem.imageUrl || null,
          published_at: newsItem.publishedAt || new Date().toISOString(),
          is_manual: false,
          is_pinned: false,
          user_id: null, // 크롤링된 뉴스는 user_id가 없음
        }

        console.log(`[크롤링 저장] 저장 시도:`, JSON.stringify(insertData, null, 2))

        const { data, error } = await supabase
          .from('news')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error(`[크롤링 저장] 뉴스 저장 실패:`, error)
          console.error(`[크롤링 저장] 저장 실패한 데이터:`, JSON.stringify(insertData, null, 2))
          errors.push({ item: newsItem, error })
        } else if (data) {
          console.log(`[크롤링 저장] 저장 성공: ${data.id}`)
          savedNews.push(data)
        } else {
          console.error(`[크롤링 저장] 데이터가 반환되지 않음`)
          errors.push({ item: newsItem, error: '데이터가 반환되지 않음' })
        }
      } catch (err) {
        console.error(`[크롤링 저장] 예외 발생:`, err)
        errors.push({ item: newsItem, error: err })
      }
    }

    console.log(`[크롤링 저장] ${savedNews.length}개 뉴스 저장 완료`)
    if (errors.length > 0) {
      console.error(`[크롤링 저장] ${errors.length}개 오류 발생:`, errors)
    }

    return NextResponse.json({
      success: true,
      saved: savedNews.length,
      skipped: newsItems.length - savedNews.length - errors.length,
      errors: errors.length > 0 ? errors.map(e => ({ 
        title: e.item.title, 
        error: e.error?.message || String(e.error) 
      })) : undefined,
    })
  } catch (error) {
    console.error('[크롤링 저장] 오류:', error)
    return NextResponse.json(
      { error: '뉴스 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
