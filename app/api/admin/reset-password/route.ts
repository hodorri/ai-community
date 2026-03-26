import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service Role Key 없음' }, { status: 500 })
    }

    // 관리자 확인
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId와 newPassword가 필요합니다.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      return NextResponse.json({ error: `비밀번호 변경 실패: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
