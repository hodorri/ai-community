import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ error: 'postId가 필요합니다.' }, { status: 400 })
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*, user:profiles(email, name, nickname, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: '댓글을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

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
    const { post_id, content, parent_id } = body

    if (!post_id || !content) {
      return NextResponse.json({ error: 'post_id와 content가 필요합니다.' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select('*, user:profiles(email, name, nickname, avatar_url)')
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: '댓글 작성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
