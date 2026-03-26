import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

// 포인트 설정 조회
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('point_settings')
      .select('*')
      .order('activity_type', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '설정 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ settings: data || [] })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 관리자: 포인트 설정 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    const body = await request.json()
    const { id, points } = body

    if (!id || points === undefined) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('point_settings')
      .update({ points: parseInt(points), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '설정 수정 실패' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
