import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: notices, error } = await supabase
      .from('notices')
      .select('*, user:profiles(email)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: '공지사항을 불러오는데 실패했습니다.', details: error.message }, { status: 500 })
    }

    const noticesWithCounts = await Promise.all(
      (notices || []).map(async (notice: any) => {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from('notice_likes')
            .select('*', { count: 'exact', head: true })
            .eq('notice_id', notice.id),
          supabase
            .from('notice_comments')
            .select('*', { count: 'exact', head: true })
            .eq('notice_id', notice.id),
        ])

        return {
          ...notice,
          likes_count: likesResult.count || 0,
          comments_count: commentsResult.count || 0,
        }
      })
    )

    return NextResponse.json({ notices: noticesWithCounts })
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

    // 관리자 확인
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자만 공지사항을 작성할 수 있습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, image_urls } = body

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 })
    }

    const { data: notice, error } = await supabase
      .from('notices')
      .insert({
        user_id: user.id,
        title,
        content,
        image_urls: image_urls || [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '공지사항 작성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(notice)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
