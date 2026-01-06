import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// selected_news 항목 삭제
export async function DELETE(request: NextRequest) {
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
      console.error('[삭제] 인증 오류:', userError)
      return NextResponse.json({ error: '인증 오류: ' + (userError?.message || '사용자 정보를 가져올 수 없습니다.') }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { ids }: { ids: string[] } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '삭제할 항목을 선택해주세요.' }, { status: 400 })
    }

    console.log(`[삭제] ${ids.length}개 항목 삭제 시작`)

    // 삭제하기 전에 crawled_news_id 수집
    const { data: selectedNewsItems, error: fetchError } = await supabase
      .from('selected_news')
      .select('id, crawled_news_id')
      .in('id', ids)

    if (fetchError) {
      console.error('[삭제] 조회 오류:', fetchError)
      return NextResponse.json({ error: '조회 실패: ' + fetchError.message }, { status: 500 })
    }

    // selected_news에서 삭제
    const { error: deleteError } = await supabase
      .from('selected_news')
      .delete()
      .in('id', ids)

    if (deleteError) {
      console.error('[삭제] 오류:', deleteError)
      return NextResponse.json({ error: '삭제 실패: ' + deleteError.message }, { status: 500 })
    }

    // crawled_news_id가 있는 항목들의 is_published를 false로 업데이트
    if (selectedNewsItems && selectedNewsItems.length > 0) {
      const crawledNewsIds = selectedNewsItems
        .map(item => item.crawled_news_id)
        .filter((id): id is string => !!id)

      if (crawledNewsIds.length > 0) {
        const { error: updateError } = await supabase
          .from('crawled_news')
          .update({ is_published: false })
          .in('id', crawledNewsIds)

        if (updateError) {
          console.error('[삭제] crawled_news 업데이트 오류:', updateError)
          // 업데이트 실패해도 삭제는 성공했으므로 경고만 로그
        } else {
          console.log(`[삭제] ${crawledNewsIds.length}개 crawled_news의 is_published를 false로 업데이트`)
        }
      }
    }

    console.log(`[삭제] ${ids.length}개 항목 삭제 완료`)

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    })
  } catch (error: any) {
    console.error('[삭제] 오류:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
