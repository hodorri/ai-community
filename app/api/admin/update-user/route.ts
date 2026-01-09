import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export async function PATCH(request: NextRequest) {
  try {
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
      console.error('[사용자 수정] 인증 오류:', authError)
      return NextResponse.json({ 
        error: '인증 오류: ' + authError.message,
        details: 'Auth session missing. Please log in again.'
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ 
        error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
        details: 'User not found in session'
      }, { status: 401 })
    }

    // 관리자 권한 확인
    if (!ADMIN_EMAIL) {
      return NextResponse.json({ 
        error: '관리자 설정이 필요합니다.',
        details: 'NEXT_PUBLIC_ADMIN_EMAIL environment variable is not set'
      }, { status: 500 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ 
        error: '관리자 권한이 필요합니다.',
        details: `User email (${user.email}) does not match admin email (${ADMIN_EMAIL})`
      }, { status: 403 })
    }

    const body = await request.json()
    const { userId, name, employee_number, company, team, position } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 })
    }

    // 서비스 롤 키를 사용하여 업데이트 (RLS 우회)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[사용자 수정] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
      return NextResponse.json({
        error: '서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY가 필요합니다.',
        details: '환경 변수를 확인해주세요.'
      }, { status: 500 })
    }

    const serviceSupabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 업데이트할 데이터 객체 생성
    const updatePayload: { [key: string]: any } = {}
    if (name !== undefined) updatePayload.name = name === '' ? null : name
    if (employee_number !== undefined) updatePayload.employee_number = employee_number === '' ? null : employee_number
    if (company !== undefined) updatePayload.company = company === '' ? null : company
    if (team !== undefined) updatePayload.team = team === '' ? null : team
    if (position !== undefined) updatePayload.position = position === '' ? null : position
    updatePayload.updated_at = new Date().toISOString()

    // 서비스 롤 키를 사용하여 직접 업데이트 (RLS 우회)
    const { data: updatedProfile, error: updateError } = await serviceSupabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[사용자 수정] 업데이트 오류:', updateError)
      return NextResponse.json({ 
        error: updateError.message || '프로필 업데이트에 실패했습니다.',
        details: updateError
      }, { status: 500 })
    }

    if (!updatedProfile) {
      return NextResponse.json({
        error: '프로필을 찾을 수 없습니다.',
        details: 'Update succeeded but profile not found'
      }, { status: 404 })
    }

    console.log('[사용자 수정] 성공:', updatedProfile.email)

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })
  } catch (error) {
    console.error('[사용자 수정] 예외:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
