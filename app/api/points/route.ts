import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 유저의 포인트 내역 및 총점 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 })
    }

    // 포인트 내역 조회
    const { data: points, error } = await supabase
      .from('activity_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '포인트 조회 실패' }, { status: 500 })
    }

    // 총점 계산
    const totalPoints = (points || []).reduce((sum: number, p: any) => sum + p.points, 0)

    return NextResponse.json({ points: points || [], totalPoints })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 자동 포인트 적립
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }

    const body = await request.json()
    const { activity_type, reference_id, description } = body

    // 포인트 설정에서 해당 활동의 포인트 조회
    const { data: setting } = await supabase
      .from('point_settings')
      .select('points, is_auto')
      .eq('activity_type', activity_type)
      .single()

    if (!setting || !setting.is_auto) {
      return NextResponse.json({ error: '자동 적립이 불가능한 활동입니다.' }, { status: 400 })
    }

    // 중복 적립 방지 (같은 reference_id로 이미 적립된 경우)
    if (reference_id) {
      const { data: existing } = await supabase
        .from('activity_points')
        .select('id')
        .eq('user_id', user.id)
        .eq('activity_type', activity_type)
        .eq('reference_id', reference_id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ message: '이미 적립된 포인트입니다.', duplicate: true })
      }
    }

    const { data: point, error } = await supabase
      .from('activity_points')
      .insert({
        user_id: user.id,
        points: setting.points,
        activity_type,
        description: description || null,
        reference_id: reference_id || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '포인트 적립 실패' }, { status: 500 })
    }

    return NextResponse.json(point)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
