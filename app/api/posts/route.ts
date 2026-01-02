import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('[API] 게시글 조회 시작 - limit:', limit, 'offset:', offset)

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, user:profiles(email)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[API] 게시글 조회 오류:', error)
      console.error('[API] 오류 상세:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: '게시글을 불러오는데 실패했습니다.',
        details: error.message 
      }, { status: 500 })
    }

    console.log('[API] 조회된 게시글 수:', posts?.length || 0)

    // 각 게시글의 좋아요 수와 댓글 수 조회
    const postsWithCounts = await Promise.all(
      (posts || []).map(async (post: any) => {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id),
          supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id),
        ])

        return {
          ...post,
          likes_count: likesResult.count || 0,
          comments_count: commentsResult.count || 0,
        }
      })
    )

    console.log('[API] 게시글 조회 완료 - 총', postsWithCounts.length, '개')
    return NextResponse.json({ posts: postsWithCounts })
  } catch (error) {
    console.error('[API] 예외 발생:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('인증 오류:', authError)
      return NextResponse.json({ error: `인증 오류: ${authError.message}` }, { status: 401 })
    }

    if (!user) {
      console.error('사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('인증된 사용자:', user.email)

    const body = await request.json()
    const { title, content, image_urls } = body

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 })
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        content,
        image_urls: image_urls || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json({ error: '게시글 작성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
