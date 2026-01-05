import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { copId, copName, memberEmail, memberName } = body

    console.log('[API] notify-cop-member-approved 호출됨:', { copId, copName, memberEmail, memberName })

    if (!copId) {
      console.error('[API] copId가 없습니다.')
      return NextResponse.json({ error: 'copId가 필요합니다.' }, { status: 400 })
    }

    if (!copName) {
      console.error('[API] copName이 없습니다.')
      return NextResponse.json({ error: 'copName이 필요합니다.' }, { status: 400 })
    }

    if (!memberEmail) {
      console.error('[API] memberEmail이 없습니다.')
      return NextResponse.json({ error: 'memberEmail이 필요합니다.' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      // Resend API 키가 없으면 간단한 로그만 남기고 성공 반환
      console.log(`[이메일 알림] CoP 가입 승인: ${copName}`)
      console.log(`[멤버 알림] ${memberEmail}에게 알림 필요`)
      console.warn('[API] RESEND_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json({ 
        success: true, 
        message: '이메일 서비스가 설정되지 않았습니다. 콘솔에 로그를 확인하세요.' 
      })
    }

    // Resend API를 사용한 이메일 발송
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const copUrl = `${siteUrl}/cop/${copId}`

    console.log('[API] Resend API 호출 시작:', { to: memberEmail, copName })
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OK AI Community <onboarding@resend.dev>',
        to: [memberEmail],
        subject: `[가입 승인] ${copName}에 가입이 승인되었습니다!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF6600;">CoP 가입 승인 알림</h2>
            <p>${memberName ? `${memberName}님, ` : ''}축하합니다! ${copName}에 가입이 승인되었습니다.</p>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF6600;">
              <p><strong>CoP 활동명:</strong> ${copName}</p>
              <p><strong>승인 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            <div style="margin: 30px 0;">
              <a href="${copUrl}" 
                 style="background-color: #FF6600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                CoP 페이지로 이동하여 활동 시작하기
              </a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              이제 ${copName}의 멤버가 되었습니다! CoP 페이지에서 활동을 시작해보세요.
            </p>
          </div>
        `,
      }),
    })

    const responseData = await emailResponse.json()
    
    if (!emailResponse.ok) {
      console.error('[API] Resend API 오류:', responseData)
      console.error('[API] 이메일 발송 실패 상세:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: responseData,
        memberEmail: memberEmail
      })
      return NextResponse.json({ 
        success: false, 
        error: '이메일 발송 실패',
        details: responseData
      }, { status: 500 })
    }

    console.log('[API] 이메일 발송 성공:', responseData)
    console.log('[API] 발송된 이메일 ID:', responseData.id)
    console.log('[API] 수신자:', memberEmail)
    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}
