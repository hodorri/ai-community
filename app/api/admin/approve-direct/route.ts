import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

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

    // SQL을 직접 실행하여 RLS 우회
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE profiles 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `,
      params: [status, userId]
    })

    // exec_sql 함수가 없으면 다른 방법 사용
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      // 직접 SQL 실행 (Supabase의 SQL Editor 기능 사용 불가)
      // 대신 SECURITY DEFINER 함수 사용
      const { data: funcData, error: funcError } = await supabase.rpc('approve_user_profile', {
        current_user_id_param: user.id,
        user_id: userId,
        new_status: status
      })

      if (funcError) {
        console.error('함수 실행 오류:', funcError)
        return NextResponse.json({ 
          error: funcError.message || '프로필 업데이트에 실패했습니다.',
          details: funcError
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, profile: funcData })
    }

    if (error) {
      console.error('SQL 실행 오류:', error)
      return NextResponse.json({ 
        error: error.message || '프로필 업데이트에 실패했습니다.',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
