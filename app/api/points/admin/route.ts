import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

// 관리자: 전체 유저 포인트 랭킹 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    // 모든 유저 프로필 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, name, nickname, company, team, position, avatar_url')
      .eq('status', 'approved')
      .order('name', { ascending: true })

    if (!profiles) {
      return NextResponse.json({ users: [] })
    }

    // 각 유저의 총 포인트 조회
    const usersWithPoints = await Promise.all(
      profiles.map(async (profile: any) => {
        const { data: points } = await supabase
          .from('activity_points')
          .select('points')
          .eq('user_id', profile.id)

        const totalPoints = (points || []).reduce((sum: number, p: any) => sum + p.points, 0)

        return {
          ...profile,
          totalPoints,
        }
      })
    )

    // 포인트 내림차순 정렬
    usersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints)

    return NextResponse.json({ users: usersWithPoints })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 관리자: 수동 포인트 부과/차감
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, points, activity_type, description } = body

    if (!user_id || points === undefined || !activity_type) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    const { data: point, error } = await supabase
      .from('activity_points')
      .insert({
        user_id,
        points: parseInt(points),
        activity_type,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '포인트 부과 실패: ' + error.message }, { status: 500 })
    }

    return NextResponse.json(point)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 관리자: 포인트 내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    const body = await request.json()
    const { point_id } = body

    if (!point_id) {
      return NextResponse.json({ error: 'point_id 필요' }, { status: 400 })
    }

    const { error } = await supabase
      .from('activity_points')
      .delete()
      .eq('id', point_id)

    if (error) {
      return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
