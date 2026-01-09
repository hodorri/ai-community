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
      console.error('[승인] 인증 오류 상세:', {
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
      console.error('[승인] 사용자 정보 없음')
      return NextResponse.json({ 
        error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
        details: 'User not found in session'
      }, { status: 401 })
    }

    console.log('[승인] 현재 사용자:', {
      id: user.id,
      email: user.email,
      adminEmail: ADMIN_EMAIL,
      isAdmin: user.email === ADMIN_EMAIL
    })

    // 관리자 권한 확인 - 이메일 비교
    if (!ADMIN_EMAIL) {
      console.error('[승인] ADMIN_EMAIL이 설정되지 않음')
      return NextResponse.json({ 
        error: '관리자 설정이 필요합니다.',
        details: 'NEXT_PUBLIC_ADMIN_EMAIL environment variable is not set'
      }, { status: 500 })
    }

    if (user.email !== ADMIN_EMAIL) {
      console.error('[승인] 관리자 권한 없음:', {
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
    const { userId, status } = body

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId와 status가 필요합니다.' }, { status: 400 })
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    // 먼저 대상 사용자가 존재하는지 확인
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, status')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('[승인] 프로필 조회 오류:', checkError)
      return NextResponse.json({ 
        error: '사용자를 찾을 수 없습니다.',
        details: checkError
      }, { status: 404 })
    }

    if (!existingProfile) {
      return NextResponse.json({ 
        error: '대상 사용자를 찾을 수 없습니다.',
        details: `User with ID ${userId} not found`
      }, { status: 404 })
    }

    console.log('[승인] 대상 사용자:', {
      id: existingProfile.id,
      email: existingProfile.email,
      currentStatus: existingProfile.status,
      newStatus: status
    })

    // SECURITY DEFINER 함수를 사용하여 프로필 업데이트 (RLS 우회)
    const { data: updatedProfile, error: rpcError } = await supabase.rpc('approve_user_profile', {
      target_user_id: userId,
      new_status: status
    })

    if (rpcError) {
      console.error('[승인] RPC 함수 실행 오류:', rpcError)
      console.error('[승인] 오류 상세:', JSON.stringify(rpcError, null, 2))
      
      // 함수가 없거나 오류가 발생한 경우, 직접 업데이트 시도 (fallback)
      console.log('[승인] RPC 실패, 직접 업데이트 시도...')
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (updateError) {
        console.error('[승인] 직접 업데이트도 실패:', updateError)
        return NextResponse.json({ 
          error: updateError.message || '프로필 업데이트에 실패했습니다.',
          details: updateError,
          rpcError: rpcError
        }, { status: 500 })
      }

      if (!updateResult || updateResult.length === 0) {
        return NextResponse.json({ 
          error: '프로필 업데이트에 실패했습니다.',
          details: 'Update returned no rows',
          rpcError: rpcError
        }, { status: 500 })
      }

      const fallbackProfile = updateResult[0]
      console.log('[승인] 직접 업데이트 성공 (fallback):', fallbackProfile.email)
      
      return NextResponse.json({ 
        success: true, 
        profile: fallbackProfile 
      })
    }

    if (!updatedProfile) {
      return NextResponse.json({ 
        error: '업데이트된 프로필을 찾을 수 없습니다.',
        details: 'RPC function returned null'
      }, { status: 500 })
    }

    console.log('[승인] RPC 함수로 업데이트 성공:', {
      email: updatedProfile.email,
      oldStatus: existingProfile.status,
      newStatus: updatedProfile.status
    })

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
