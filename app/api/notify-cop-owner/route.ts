import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { copId, copName, requesterName, requesterEmail } = body

    if (!copId) {
      return NextResponse.json({ error: 'copId가 필요합니다.' }, { status: 400 })
    }

    if (!copName) {
      return NextResponse.json({ error: 'copName이 필요합니다.' }, { status: 400 })
    }

    // CoP 개설자 정보 조회
    const supabase = await createClient()
    const { data: cop, error: copError } = await supabase
      .from('cops')
      .select('user_id')
      .eq('id', copId)
      .single()

    if (copError || !cop) {
      console.error('CoP 조회 오류:', copError)
      return NextResponse.json({ error: 'CoP를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 개설자의 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name, nickname')
      .eq('id', cop.user_id)
      .maybeSingle()

    if (profileError || !profile || !profile.email) {
      console.error('프로필 조회 오류:', profileError)
      return NextResponse.json({ error: '개설자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const ownerEmail = profile.email
    const ownerName = profile.nickname || profile.name || ''

    if (!RESEND_API_KEY) {
      // Resend API 키가 없으면 간단한 로그만 남기고 성공 반환
      console.log(`[이메일 알림] CoP 가입 요청: ${copName}`)
      console.log(`[개설자 알림] ${ownerEmail}에게 알림 필요`)
      console.log(`[신청자] ${requesterName || requesterEmail || '-'}`)
      return NextResponse.json({ 
        success: true, 
        message: '이메일 서비스가 설정되지 않았습니다. 콘솔에 로그를 확인하세요.' 
      })
    }

    // Resend API를 사용한 이메일 발송
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const copUrl = `${siteUrl}/cop/${copId}`

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OK AI Community <onboarding@resend.dev>',
        to: [ownerEmail],
        subject: `[가입 요청] ${copName}에 새로운 가입 요청이 있습니다`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF6600;">CoP 가입 요청 알림</h2>
            <p>${ownerName ? `${ownerName}님, ` : ''}${copName}에 새로운 가입 요청이 접수되었습니다.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>CoP 활동명:</strong> ${copName}</p>
              <p><strong>신청자:</strong> ${requesterName || requesterEmail || '-'}</p>
              <p><strong>신청자 이메일:</strong> ${requesterEmail || '-'}</p>
              <p><strong>요청 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            <div style="margin: 30px 0;">
              <a href="${copUrl}" 
                 style="background-color: #FF6600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                CoP 페이지로 이동
              </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              이 링크를 클릭하면 CoP 페이지로 이동하여 가입 요청을 승인하거나 거부할 수 있습니다.
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
