import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 선택한 crawled_news 항목을 selected_news 테이블에 저장
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
      console.error('[게시] 인증 오류:', userError)
      return NextResponse.json({ error: '인증 오류: ' + (userError?.message || '사용자 정보를 가져올 수 없습니다.') }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { crawledNewsIds }: { crawledNewsIds: string[] } = body

    if (!crawledNewsIds || !Array.isArray(crawledNewsIds) || crawledNewsIds.length === 0) {
      return NextResponse.json({ error: '게시할 항목을 선택해주세요.' }, { status: 400 })
    }

    console.log(`[게시] ${crawledNewsIds.length}개 항목 게시 시작`)

    // crawled_news에서 데이터 가져오기
    const { data: crawledItems, error: fetchError } = await supabase
      .from('crawled_news')
      .select('*')
      .in('id', crawledNewsIds)
      .eq('is_published', false) // 아직 게시되지 않은 것만

    if (fetchError) {
      console.error('[게시] 데이터 조회 오류:', fetchError)
      return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 })
    }

    if (!crawledItems || crawledItems.length === 0) {
      return NextResponse.json({ error: '게시할 항목을 찾을 수 없습니다.' }, { status: 400 })
    }

    // selected_news 테이블에 저장
    const publishedNews = []
    const errors: Array<{ id: string; error: any }> = []

    for (const item of crawledItems) {
      try {
        // 중복 체크 (이미 selected_news에 있는지)
        const { data: existingSelected } = await supabase
          .from('selected_news')
          .select('id')
          .eq('crawled_news_id', item.id)
          .maybeSingle()

        if (existingSelected) {
          console.log(`[게시] 이미 선택된 항목 건너뜀: ${item.title}`)
          continue
        }

        // selected_news 테이블에 저장
        const { data: selectedData, error: insertError } = await supabase
          .from('selected_news')
          .insert({
            crawled_news_id: item.id,
            title: item.title,
            content: item.content || '',
            source_url: item.source_url,
            source_site: item.source_site || '네이버 뉴스',
            author_name: item.author_name || null,
            image_url: item.image_url || null,
            published_at: item.published_at || new Date().toISOString(),
            selected_by: user.id,
          })
          .select()
          .single()

        if (insertError) {
          console.error(`[게시] selected_news 저장 실패:`, insertError)
          errors.push({ id: item.id, error: insertError })
        } else if (selectedData) {
          // crawled_news의 is_published 업데이트
          await supabase
            .from('crawled_news')
            .update({ 
              is_published: true,
            })
            .eq('id', item.id)

          publishedNews.push(selectedData)
          console.log(`[게시] 저장 성공: ${selectedData.id} - ${item.title}`)
        }
      } catch (err) {
        console.error(`[게시] 예외 발생:`, err)
        errors.push({ id: item.id, error: err })
      }
    }

    console.log(`[게시] ${publishedNews.length}개 뉴스 게시 완료`)

    return NextResponse.json({
      success: true,
      published: publishedNews.length,
      skipped: crawledItems.length - publishedNews.length - errors.length,
      errors: errors.length > 0 ? errors.map(e => ({ 
        id: e.id, 
        error: e.error?.message || String(e.error) 
      })) : undefined,
    })
  } catch (error: any) {
    console.error('[게시] 오류:', error)
    return NextResponse.json(
      { error: '게시 중 오류가 발생했습니다.', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
