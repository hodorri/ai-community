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
      console.error('[CoP 승인] 인증 오류 상세:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      })
      return NextResponse.json({ 
        error: '인증 오류: ' + authError.message,
        details: 'Auth session missing. Please log in again.'
      }, { status: 401 })
    }

    if (!user) {
      console.error('[CoP 승인] 사용자 정보 없음')
      return NextResponse.json({ 
        error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
        details: 'User not found in session'
      }, { status: 401 })
    }

    console.log('[CoP 승인] 현재 사용자:', {
      id: user.id,
      email: user.email,
      adminEmail: ADMIN_EMAIL,
      isAdmin: user.email === ADMIN_EMAIL
    })

    // 관리자 권한 확인 - 이메일 비교
    if (!ADMIN_EMAIL) {
      console.error('[CoP 승인] ADMIN_EMAIL이 설정되지 않음')
      return NextResponse.json({ 
        error: '관리자 설정이 필요합니다.',
        details: 'NEXT_PUBLIC_ADMIN_EMAIL environment variable is not set'
      }, { status: 500 })
    }

    if (user.email !== ADMIN_EMAIL) {
      console.error('[CoP 승인] 관리자 권한 없음:', {
        userEmail: user.email,
        adminEmail: ADMIN_EMAIL,
        match: user.email === ADMIN_EMAIL
      })
      return NextResponse.json({ 
        error: '관리자 권한이 필요합니다.',
        details: `User email (${user.email}) does not match admin email (${ADMIN_EMAIL})`
      }, { status: 403 })
    }

    const body = await request.json()
    const { copId, status } = body

    if (!copId || !status) {
      return NextResponse.json({ error: 'copId와 status가 필요합니다.' }, { status: 400 })
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    // 서비스 롤 키를 사용하여 조회 및 업데이트 (RLS 우회)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[CoP 승인] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
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

    // 서비스 롤 키를 사용하여 대상 CoP가 존재하는지 확인 (RLS 우회)
    const { data: existingCop, error: checkError } = await serviceSupabase
      .from('cops')
      .select('id, name, status')
      .eq('id', copId)
      .maybeSingle()

    if (checkError) {
      console.error('[CoP 승인] CoP 조회 오류:', checkError)
      return NextResponse.json({ 
        error: 'CoP를 찾을 수 없습니다.',
        details: checkError
      }, { status: 404 })
    }

    if (!existingCop) {
      return NextResponse.json({ 
        error: '대상 CoP를 찾을 수 없습니다.',
        details: `CoP with ID ${copId} not found`
      }, { status: 404 })
    }

    console.log('[CoP 승인] 대상 CoP:', {
      id: existingCop.id,
      name: existingCop.name,
      currentStatus: existingCop.status,
      newStatus: status
    })

    // 서비스 롤 키를 사용하여 직접 업데이트 (RLS 우회)
    const { data: updatedCop, error: updateError } = await serviceSupabase
      .from('cops')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', copId)
      .select()
      .single()

    if (updateError) {
      console.error('[CoP 승인] 업데이트 오류:', updateError)
      console.error('[CoP 승인] 오류 상세:', JSON.stringify(updateError, null, 2))
      return NextResponse.json({ 
        error: updateError.message || 'CoP 업데이트에 실패했습니다.',
        details: updateError,
        code: updateError.code,
        hint: updateError.hint
      }, { status: 500 })
    }

    if (!updatedCop) {
      console.error('[CoP 승인] 업데이트 성공했으나 CoP 조회 실패', { copId })
      return NextResponse.json({
        error: 'CoP를 찾을 수 없습니다.',
        details: 'Update succeeded but CoP not found'
      }, { status: 404 })
    }

    console.log('[CoP 승인] 성공:', updatedCop.name, '->', status)

    return NextResponse.json({
      success: true,
      cop: updatedCop
    })
  } catch (error) {
    console.error('[CoP 승인] 예외:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
