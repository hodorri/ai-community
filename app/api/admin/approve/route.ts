import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export async function POST(request: NextRequest) {
  try {
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
      console.error('[승인] 인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('[승인] 사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('[승인] 현재 사용자:', user.email)

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, status } = body

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId와 status가 필요합니다.' }, { status: 400 })
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    // SECURITY DEFINER 함수를 사용하여 프로필 업데이트 (RLS 우회)
    const { data, error } = await supabase.rpc('approve_user_profile', {
      target_user_id: userId,
      new_status: status
    })

    if (error) {
      console.error('프로필 업데이트 오류:', error)
      console.error('에러 상세:', JSON.stringify(error, null, 2))
      console.error('현재 사용자 ID:', user.id)
      console.error('대상 사용자 ID:', userId)
      
      // 함수가 없거나 오류가 발생한 경우, 직접 업데이트 시도
      // (서버 사이드에서는 service role key가 있어야 함)
      const { data: directData, error: directError } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId)
        .select()
        .single()

      if (directError) {
        return NextResponse.json({ 
          error: directError.message || '프로필 업데이트에 실패했습니다.',
          details: directError,
          user_id: user.id,
          target_id: userId,
          hint: 'approve_user_profile 함수 호출 실패 후 직접 업데이트도 실패'
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, profile: directData })
    }

    if (!data) {
      return NextResponse.json({ error: '업데이트된 프로필을 찾을 수 없습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
