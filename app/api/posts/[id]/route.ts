import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: post, error } = await supabase
      .from('posts')
      .select('*, user:profiles(email)')
      .eq('id', params.id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 게시글 소유자 확인
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!post || post.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, image_urls } = body

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 })
    }

    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        image_urls: image_urls || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating post:', error)
      return NextResponse.json({ error: '게시글 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 게시글 소유자 확인
    const { data: post } = await supabase
      .from('posts')
      .select('user_id, image_urls')
      .eq('id', params.id)
      .single()

    if (!post || post.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 이미지 삭제
    if (post.image_urls && post.image_urls.length > 0) {
      for (const url of post.image_urls) {
        const path = url.split('/post-images/')[1]
        if (path) {
          await supabase.storage.from('post-images').remove([path])
        }
      }
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting post:', error)
      return NextResponse.json({ error: '게시글 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
