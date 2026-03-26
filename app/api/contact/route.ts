import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseAdmin() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('문의 조회 오류:', error)
      return NextResponse.json({ error: '문의 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ contacts: data || [] })
  } catch (error) {
    console.error('문의 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, is_resolved } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('contacts')
      .update({ is_resolved })
      .eq('id', id)

    if (error) {
      console.error('문의 상태 변경 오류:', error)
      return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('문의 상태 변경 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, employeeNumber, content, contact } = body

    if (!name?.trim() || !content?.trim() || !contact?.trim()) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    // DB에 문의 저장 (서비스 롤 키 또는 anon 키로)
    const supabase = getSupabaseAdmin()

    const { error: dbError } = await supabase
      .from('contacts')
      .insert({
        name: name.trim(),
        employee_number: employeeNumber?.trim() || null,
        content: content.trim(),
        contact_info: contact.trim(),
      })

    if (dbError) {
      console.error('문의 저장 오류:', dbError)
      return NextResponse.json(
        { error: '문의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    // 이메일 발송 시도 (실패해도 DB에는 저장됨)
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'OK AI Community <onboarding@resend.dev>',
            to: [ADMIN_EMAIL],
            subject: `[문의] ${name} - ${content.substring(0, 30)}`,
            html: `
              <h2>새 문의가 접수되었습니다</h2>
              <p><strong>이름:</strong> ${name}</p>
              <p><strong>사번:</strong> ${employeeNumber || '-'}</p>
              <p><strong>연락처:</strong> ${contact}</p>
              <p><strong>내용:</strong></p>
              <p style="white-space:pre-wrap;background:#f5f5f5;padding:15px;border-radius:5px;">${content}</p>
            `,
          }),
        })
      } catch (emailErr) {
        console.error('이메일 발송 실패:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('문의 처리 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
