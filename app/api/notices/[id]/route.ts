import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: notice, error } = await supabase
      .from('notices')
      .select('*, user:profiles(email)')
      .eq('id', params.id)
      .single()

    if (error || !notice) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(notice)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자만 공지사항을 수정할 수 있습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, image_urls } = body

    const { data: notice, error } = await supabase
      .from('notices')
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
      return NextResponse.json({ error: '공지사항 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(notice)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자만 공지사항을 삭제할 수 있습니다.' }, { status: 403 })
    }

    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: '공지사항 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
