import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 승인 상태 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isApproved = profile?.status === 'approved' || isAdmin

    if (!isApproved) {
      return NextResponse.json({ error: '관리자 승인이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { post_id } = body

    if (!post_id) {
      return NextResponse.json({ error: 'post_id가 필요합니다.' }, { status: 400 })
    }

    // 기존 좋아요 확인
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      // 좋아요 취소
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error removing like:', error)
        return NextResponse.json({ error: '좋아요 취소에 실패했습니다.' }, { status: 500 })
      }

      // 좋아요 수 조회
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post_id)

      return NextResponse.json({ liked: false, count: count || 0 })
    } else {
      // 좋아요 추가
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id,
          user_id: user.id,
        })

      if (error) {
        console.error('Error adding like:', error)
        return NextResponse.json({ error: '좋아요 추가에 실패했습니다.' }, { status: 500 })
      }

      // 좋아요 수 조회
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post_id)

      return NextResponse.json({ liked: true, count: (count || 0) + 1 })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
