import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 토큰으로 Supabase 클라이언트 생성 (뉴스 삭제와 동일한 방식)
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
      console.error('[AI 활용사례 삭제] 인증 오류:', userError)
      return NextResponse.json({ error: '인증 오류: ' + (userError?.message || '사용자 정보를 가져올 수 없습니다.') }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    console.log(`[AI 활용사례 삭제] ${params.id} 삭제 시작`)

    // 삭제 전에 존재하는 항목 확인
    const { data: existingItem, error: checkError } = await supabase
      .from('ai_cases')
      .select('id, title, author_name')
      .eq('id', params.id)
      .maybeSingle()

    if (checkError) {
      console.error('[AI 활용사례 삭제] 조회 오류:', checkError)
      return NextResponse.json({ error: '조회 실패: ' + checkError.message }, { status: 500 })
    }

    if (!existingItem) {
      console.log(`[AI 활용사례 삭제] 존재하지 않는 항목: ${params.id}`)
      return NextResponse.json({ 
        success: true, 
        deleted: 0,
        message: '삭제할 항목이 없습니다.'
      })
    }

    console.log(`[AI 활용사례 삭제] 존재하는 항목 발견: ${existingItem.title} (작성자: ${existingItem.author_name})`)

    // ai_cases에서 삭제
    const { data: deletedData, error: deleteError } = await supabase
      .from('ai_cases')
      .delete()
      .eq('id', params.id)
      .select()

    if (deleteError) {
      console.error('[AI 활용사례 삭제] 삭제 오류:', deleteError)
      console.error('[AI 활용사례 삭제] 삭제 오류 상세:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint
      })
      return NextResponse.json({ error: '삭제 실패: ' + deleteError.message }, { status: 500 })
    }

    const deletedCount = deletedData?.length || 0
    console.log(`[AI 활용사례 삭제] ${deletedCount}개 항목 삭제 완료`)

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
    })
  } catch (error: any) {
    console.error('[AI 활용사례 삭제] 오류:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
