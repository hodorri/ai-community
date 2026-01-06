import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 사용자 삭제
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
    const { userIds }: { userIds: string[] } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '삭제할 사용자 ID가 필요합니다.' }, { status: 400 })
    }

    console.log(`[삭제] 사용자 삭제 시작: ${userIds.length}개`)

    // profiles 테이블에서 삭제
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds)

    if (deleteError) {
      console.error('[삭제] 오류:', deleteError)
      return NextResponse.json({ error: '삭제 실패: ' + deleteError.message }, { status: 500 })
    }

    // auth.users에서도 삭제 (관리자 권한 필요 - service role key 사용 권장)
    // 주의: 일반 anon key로는 auth.users 삭제가 안 될 수 있음
    // 현재는 profiles만 삭제하고, auth.users는 수동으로 처리하거나 service role key를 사용해야 함

    console.log(`[삭제] 사용자 삭제 완료: ${userIds.length}개`)

    return NextResponse.json({
      success: true,
      deleted: userIds.length,
    })
  } catch (error: any) {
    console.error('[삭제] 오류:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
