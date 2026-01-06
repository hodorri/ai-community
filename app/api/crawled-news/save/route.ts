import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 선택한 뉴스 항목을 crawled_news 테이블에 저장
export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 토큰으로 Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 사용자 정보 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('[저장] 인증 오류:', userError)
      return NextResponse.json({ error: '인증 오류: ' + (userError?.message || '사용자 정보를 가져올 수 없습니다.') }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { newsItems }: { newsItems: Array<{
      title: string
      content: string
      sourceUrl: string
      sourceSite?: string
      authorName?: string
      imageUrl?: string
      publishedAt?: string
    }> } = body

    if (!newsItems || !Array.isArray(newsItems) || newsItems.length === 0) {
      return NextResponse.json({ error: '저장할 항목을 선택해주세요.' }, { status: 400 })
    }

    console.log(`[저장] ${newsItems.length}개 항목 저장 시작 (사용자: ${user.email})`)

    // crawled_news 테이블에 저장
    const savedItems = []
    const errors: Array<{ item: any; error: any }> = []

    for (const item of newsItems) {
      try {
        // 중복 체크
        const { data: existing } = await supabase
          .from('crawled_news')
          .select('id')
          .eq('source_url', item.sourceUrl)
          .eq('uploaded_by', user.id)
          .maybeSingle()

        if (existing) {
          console.log(`[저장] 중복 항목 건너뜀: ${item.title}`)
          continue
        }

        // crawled_news에 저장
        const insertData: any = {
          title: item.title,
          content: item.content || '',
          source_url: item.sourceUrl,
          source_site: item.sourceSite || '네이버 뉴스',
          uploaded_by: user.id,
          is_published: false,
        }
        
        // 선택적 필드 추가
        if (item.authorName) {
          insertData.author_name = item.authorName
        }
        if (item.imageUrl) {
          insertData.image_url = item.imageUrl
        }
        if (item.publishedAt) {
          insertData.published_at = item.publishedAt
        }
        
        const { data, error } = await supabase
          .from('crawled_news')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error(`[저장] 저장 실패:`, error)
          errors.push({ item, error })
        } else if (data) {
          savedItems.push(data)
          console.log(`[저장] 저장 성공: ${data.id} - ${item.title}`)
        }
      } catch (err) {
        console.error(`[저장] 예외 발생:`, err)
        errors.push({ item, error: err })
      }
    }

    console.log(`[저장] ${savedItems.length}개 항목 저장 완료, ${errors.length}개 실패`)

    return NextResponse.json({
      success: true,
      saved: savedItems.length,
      skipped: newsItems.length - savedItems.length - errors.length,
      errors: errors.length > 0 ? errors.map(e => ({ 
        title: e.item.title, 
        error: e.error?.message || String(e.error) 
      })) : undefined,
    })
  } catch (error: any) {
    console.error('[저장] 오류:', error)
    return NextResponse.json(
      { error: '저장 중 오류가 발생했습니다.', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
