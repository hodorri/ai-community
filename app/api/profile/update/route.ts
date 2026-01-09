import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function PATCH(request: NextRequest) {
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
      console.error('[프로필 업데이트] 인증 오류:', authError)
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 서비스 롤 키로 클라이언트 생성 (RLS 우회)
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[프로필 업데이트] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
      return NextResponse.json({ 
        error: '서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY가 필요합니다.',
        details: '환경 변수를 확인해주세요.'
      }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const body = await request.json()
    const { name, nickname, avatar_url, employee_number, company, team, position } = body

    console.log('[프로필 업데이트] 요청:', {
      userId: user.id,
      email: user.email,
      updateData: {
        name: name || null,
        nickname: nickname || null,
        avatar_url: avatar_url || null,
        employee_number: employee_number || null,
        company: company || null,
        team: team || null,
        position: position || null,
      }
    })

    // 서비스 롤 키를 사용하여 직접 업데이트 (RLS 우회)
    // 본인 프로필만 업데이트 가능하도록 검증 (이미 위에서 인증 확인 완료)
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        name: name || null,
        nickname: nickname || null,
        avatar_url: avatar_url || null,
        employee_number: employee_number || null,
        company: company || null,
        team: team || null,
        position: position || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[프로필 업데이트] 업데이트 오류:', updateError)
      console.error('[프로필 업데이트] 오류 상세:', JSON.stringify(updateError, null, 2))
      return NextResponse.json({ 
        error: updateError.message || '프로필 업데이트에 실패했습니다.',
        details: updateError,
        code: updateError.code,
        hint: updateError.hint
      }, { status: 500 })
    }

    if (!updatedProfile) {
      console.error('[프로필 업데이트] 업데이트 성공했으나 프로필 조회 실패', { userId: user.id })
      return NextResponse.json({ 
        error: '프로필을 찾을 수 없습니다.',
        details: 'Update succeeded but profile not found'
      }, { status: 404 })
    }

    console.log('[프로필 업데이트] 성공:', updatedProfile.email)

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile 
    })
  } catch (error) {
    console.error('[프로필 업데이트] 예외:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}
