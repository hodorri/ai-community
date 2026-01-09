import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 사용자 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 먼저 일반 클라이언트로 인증 확인
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const serverSupabase = await createServerClient()

    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await serverSupabase.auth.getUser(token)

      if (!tokenError && tokenUser) {
        user = tokenUser
      } else {
        authError = tokenError
      }
    } else {
      // 쿠키에서 인증 정보 가져오기
      const { data: { user: cookieUser }, error: cookieError } = await serverSupabase.auth.getUser()
      user = cookieUser
      authError = cookieError
    }

    if (authError) {
      console.error('[삭제] 인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
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

    // 서비스 롤 키를 사용하여 삭제 (RLS 우회)
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[삭제] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
      return NextResponse.json({
        error: '서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY가 필요합니다.',
        details: '환경 변수를 확인해주세요.'
      }, { status: 500 })
    }

    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // profiles 테이블에서 삭제 (서비스 롤 키 사용)
    const { error: deleteError } = await serviceSupabase
      .from('profiles')
      .delete()
      .in('id', userIds)

    if (deleteError) {
      console.error('[삭제] 오류:', deleteError)
      return NextResponse.json({ error: '삭제 실패: ' + deleteError.message }, { status: 500 })
    }

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
