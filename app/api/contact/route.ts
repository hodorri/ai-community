import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, employeeNumber, content, contact } = body

    if (!name?.trim() || !content?.trim() || !contact?.trim()) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    // DB에 문의 저장
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

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
      }
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
