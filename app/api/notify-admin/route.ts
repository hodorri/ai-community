import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, userName, employeeNumber } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail이 필요합니다.' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      // Resend API 키가 없으면 간단한 로그만 남기고 성공 반환
      console.log(`[이메일 알림] 새 사용자 가입: ${userEmail}`)
      console.log(`[관리자 승인 필요] ${ADMIN_EMAIL}에게 알림 필요`)
      return NextResponse.json({ 
        success: true, 
        message: '이메일 서비스가 설정되지 않았습니다. 콘솔에 로그를 확인하세요.' 
      })
    }

    // Resend API를 사용한 이메일 발송
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const adminUrl = `${siteUrl}/admin`

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OK AI Community <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `[승인 필요] 새 사용자 가입: ${userName || userEmail}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF6600;">새 사용자 가입 알림</h2>
            <p>새로운 사용자가 회원가입을 완료했습니다.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>이름:</strong> ${userName || '-'}</p>
              <p><strong>사번:</strong> ${employeeNumber || '-'}</p>
              <p><strong>이메일:</strong> ${userEmail}</p>
              <p><strong>가입 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            <div style="margin: 30px 0;">
              <a href="${adminUrl}" 
                 style="background-color: #FF6600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                승인 페이지로 이동
              </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              이 링크를 클릭하면 관리자 페이지로 이동하여 사용자를 승인할 수 있습니다.
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
    console.error('이메일 발송 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}
