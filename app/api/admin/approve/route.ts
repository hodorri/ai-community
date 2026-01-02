import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('현재 사용자:', user.email)

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

    // 직접 프로필 업데이트 (RLS 정책이 관리자 업데이트를 허용)
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('프로필 업데이트 오류:', error)
      console.error('에러 상세:', JSON.stringify(error, null, 2))
      console.error('현재 사용자 ID:', user.id)
      console.error('대상 사용자 ID:', userId)
      
      return NextResponse.json({ 
        error: error.message || '프로필 업데이트에 실패했습니다.',
        details: error,
        user_id: user.id,
        target_id: userId
      }, { status: 500 })
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
