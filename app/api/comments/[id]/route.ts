import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

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

    const isAdmin = user.email === ADMIN_EMAIL && ADMIN_EMAIL !== ''

    // 댓글 소유자 확인
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!comment || (comment.user_id !== user.id && !isAdmin)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 })
    }

    let updateQuery = supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (!isAdmin) {
      updateQuery = updateQuery.eq('user_id', user.id) // 소유자 확인
    }

    const { data: updatedComment, error } = await updateQuery
      .select()
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json({ error: '댓글 수정에 실패했습니다.' }, { status: 500 })
    }

    if (!updatedComment) {
      return NextResponse.json({ error: '댓글을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(updatedComment)
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

    const isAdmin = user.email === ADMIN_EMAIL && ADMIN_EMAIL !== ''

    // 댓글 소유자 확인
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!comment || (comment.user_id !== user.id && !isAdmin)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    let deleteQuery = supabase
      .from('comments')
      .delete()
      .eq('id', params.id)

    if (!isAdmin) {
      deleteQuery = deleteQuery.eq('user_id', user.id) // 소유자 확인
    }

    const { data: deletedComment, error } = await deleteQuery
      .select()
      .single()

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json({ error: '댓글 삭제에 실패했습니다.' }, { status: 500 })
    }

    if (!deletedComment) {
      return NextResponse.json({ error: '댓글을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
