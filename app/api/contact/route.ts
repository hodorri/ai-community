import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, employeeNumber, content, contact } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
    }

    if (!employeeNumber || !employeeNumber.trim()) {
      return NextResponse.json({ error: '사번을 입력해주세요.' }, { status: 400 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '문의 내용을 입력해주세요.' }, { status: 400 })
    }

    if (!contact || !contact.trim()) {
      return NextResponse.json({ error: '회신받을 연락처를 입력해주세요.' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      // Resend API 키가 없으면 간단한 로그만 남기고 성공 반환
      console.log(`[문의 접수]`)
      console.log(`이름: ${name}`)
      console.log(`사번: ${employeeNumber}`)
      console.log(`문의 내용: ${content}`)
      console.log(`회신 연락처: ${contact}`)
      console.log(`[관리자 확인 필요] ${ADMIN_EMAIL}에게 알림 필요`)
      return NextResponse.json({
        success: true,
        message: '이메일 서비스가 설정되지 않았습니다. 콘솔에 로그를 확인하세요.'
      })
    }

    // Resend API를 사용한 이메일 발송
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OK AI Community <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `[문의 접수] OK AI Community 문의사항 - ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF6600;">문의사항 접수</h2>
            <p>OK AI Community에서 새로운 문의사항이 접수되었습니다.</p>
            <div style="background-color: #fff4ed; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF6600;">
              <p style="margin: 0;"><strong>이름:</strong> ${name}</p>
              <p style="margin: 5px 0 0 0;"><strong>사번:</strong> ${employeeNumber}</p>
              <p style="margin: 5px 0 0 0;"><strong>회신 연락처:</strong> ${contact}</p>
              <p style="margin: 5px 0 0 0;"><strong>접수 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">문의 내용</h3>
              <p style="white-space: pre-wrap; line-height: 1.6; color: #555;">${content.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              위 연락처로 회신해주시기 바랍니다.
            </p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend API 오류:', errorData)
      return NextResponse.json({
        success: false,
        error: '이메일 발송 실패'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('문의 전송 오류:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
