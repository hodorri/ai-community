import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { notice_id } = body

    if (!notice_id) {
      return NextResponse.json({ error: 'notice_id가 필요합니다.' }, { status: 400 })
    }

    // 기존 좋아요 확인
    const { data: existingLike } = await supabase
      .from('notice_likes')
      .select('id')
      .eq('notice_id', notice_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      // 좋아요 취소
      await supabase
        .from('notice_likes')
        .delete()
        .eq('id', existingLike.id)

      const { count } = await supabase
        .from('notice_likes')
        .select('*', { count: 'exact', head: true })
        .eq('notice_id', notice_id)

      return NextResponse.json({ liked: false, likes_count: count || 0 })
    } else {
      // 좋아요 추가
      await supabase
        .from('notice_likes')
        .insert({ notice_id, user_id: user.id })

      const { count } = await supabase
        .from('notice_likes')
        .select('*', { count: 'exact', head: true })
        .eq('notice_id', notice_id)

      return NextResponse.json({ liked: true, likes_count: count || 0 })
    }
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
