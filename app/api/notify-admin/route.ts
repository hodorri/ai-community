import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, userName, employeeNumber, company, team, position } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail이 필요합니다.' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      // Resend API 키가 없으면 에러 로그 남기고 실패 반환
      console.error(`[이메일 알림] RESEND_API_KEY가 설정되지 않았습니다.`)
      console.error(`[이메일 알림] 새 사용자 가입: ${userEmail}`)
      console.error(`[이메일 알림] 관리자 승인 필요: ${ADMIN_EMAIL || 'ADMIN_EMAIL 미설정'}`)
      return NextResponse.json({ 
        success: false, 
        error: 'RESEND_API_KEY 환경 변수가 설정되지 않았습니다.',
        message: 'Vercel 대시보드 > Environment Variables에서 RESEND_API_KEY를 설정해야 합니다.',
        hint: 'Resend.com에서 API 키를 발급받아 설정하세요.'
      }, { status: 500 })
    }

    if (!ADMIN_EMAIL) {
      console.error(`[이메일 알림] NEXT_PUBLIC_ADMIN_EMAIL이 설정되지 않았습니다.`)
      return NextResponse.json({ 
        success: false, 
        error: 'NEXT_PUBLIC_ADMIN_EMAIL 환경 변수가 설정되지 않았습니다.',
        message: '관리자 이메일 주소를 설정해야 합니다.',
        hint: 'Vercel 대시보드 > Environment Variables에서 NEXT_PUBLIC_ADMIN_EMAIL을 설정하세요.'
      }, { status: 500 })
    }

    // Resend API를 사용한 이메일 발송
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const adminUrl = `${siteUrl}/admin`

    console.log('[이메일 알림] Resend API 호출 시작:', {
      to: ADMIN_EMAIL,
      subject: `[승인 필요] 새 사용자 가입: ${userName || userEmail}`,
      hasApiKey: !!RESEND_API_KEY,
      apiKeyLength: RESEND_API_KEY?.length || 0
    })

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
              <p><strong>회사:</strong> ${company || '-'}</p>
              <p><strong>소속 팀:</strong> ${team || '-'}</p>
              <p><strong>직급:</strong> ${position || '-'}</p>
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

    const responseText = await emailResponse.text()
    console.log('[이메일 알림] Resend API 응답 상태:', emailResponse.status, emailResponse.statusText)
    console.log('[이메일 알림] Resend API 응답 본문:', responseText)

    if (!emailResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }
      console.error('[이메일 알림] Resend API 오류:', errorData)
      return NextResponse.json({ 
        success: false, 
        error: '이메일 발송 실패',
        details: errorData,
        status: emailResponse.status
      }, { status: 500 })
    }

    let successData
    try {
      successData = JSON.parse(responseText)
    } catch {
      successData = { message: responseText }
    }
    console.log('[이메일 알림] 이메일 발송 성공:', successData)

    return NextResponse.json({ 
      success: true,
      data: successData
    })
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}
