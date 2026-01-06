import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// selected_news 테이블의 모든 항목 일괄 업데이트
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
      console.error('[일괄 수정] 인증 오류:', userError)
      return NextResponse.json({ error: '인증 오류: ' + (userError?.message || '사용자 정보를 가져올 수 없습니다.') }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { authorName, imageUrl }: { authorName?: string, imageUrl?: string } = body

    if (!authorName && !imageUrl) {
      return NextResponse.json({ error: '작성자명 또는 이미지 URL 중 하나는 필수입니다.' }, { status: 400 })
    }

    console.log(`[일괄 수정] selected_news 일괄 업데이트 시작`)
    console.log(`[일괄 수정] authorName: ${authorName}, imageUrl: ${imageUrl}`)

    // 업데이트할 데이터 준비
    const updateData: { author_name?: string, image_url?: string, updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (authorName) {
      updateData.author_name = authorName
    }

    if (imageUrl) {
      updateData.image_url = imageUrl
    }

    // selected_news 테이블의 모든 항목 업데이트
    const { data: updatedData, error: updateError, count } = await supabase
      .from('selected_news')
      .update(updateData)
      .select('id')

    if (updateError) {
      console.error('[일괄 수정] 업데이트 오류:', updateError)
      return NextResponse.json({ error: '업데이트 실패: ' + updateError.message }, { status: 500 })
    }

    console.log(`[일괄 수정] ${updatedData?.length || 0}개 항목 업데이트 완료`)

    return NextResponse.json({
      success: true,
      updated: updatedData?.length || 0,
    })
  } catch (error: any) {
    console.error('[일괄 수정] 오류:', error)
    return NextResponse.json(
      { error: '일괄 수정 중 오류가 발생했습니다.', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
