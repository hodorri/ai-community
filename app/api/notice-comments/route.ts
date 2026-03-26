import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const noticeId = searchParams.get('noticeId')

    if (!noticeId) {
      return NextResponse.json({ error: 'noticeId가 필요합니다.' }, { status: 400 })
    }

    const { data: comments, error } = await supabase
      .from('notice_comments')
      .select('*')
      .eq('notice_id', noticeId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '댓글을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 프로필 정보 조회
    const commentsWithProfiles = await Promise.all(
      (comments || []).map(async (comment: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name, nickname, avatar_url, company, team, position')
          .eq('id', comment.user_id)
          .single()

        return {
          ...comment,
          user: profile || { email: null },
        }
      })
    )

    return NextResponse.json({ comments: commentsWithProfiles })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { notice_id, content, parent_id } = body

    if (!notice_id || !content) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('notice_comments')
      .insert({
        notice_id,
        user_id: user.id,
        content,
        parent_id: parent_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '댓글 작성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
