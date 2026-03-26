import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: '서버 설정 오류: Service Role Key가 없습니다.' }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await request.json()
    const { email, password, name, employeeNumber, company, team, position, userId: existingUserId } = body

    // 기존 방식 호환 (userId가 있으면 프로필만 저장)
    if (existingUserId) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', existingUserId)
        .maybeSingle()

      if (existingProfile) {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            name: name?.trim() || null,
            employee_number: employeeNumber?.trim() || null,
            company: company?.trim() || null,
            team: team?.trim() || null,
            position: position?.trim() || null,
            status: 'pending',
          })
          .eq('id', existingUserId)
          .select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, data: data?.[0] })
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: existingUserId,
            email,
            name: name?.trim() || null,
            employee_number: employeeNumber?.trim() || null,
            company: company?.trim() || null,
            team: team?.trim() || null,
            position: position?.trim() || null,
            status: 'pending',
          })
          .select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, data: data?.[0] })
      }
    }

    // 새로운 방식: 이메일+비밀번호로 회원가입 (이메일 인증 없이)
    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호가 필요합니다.' }, { status: 400 })
    }

    // 이미 가입된 이메일 확인
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 })
    }

    // Admin API로 유저 생성 (이메일 인증 스킵)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata: {
        name: name?.trim(),
        employee_number: employeeNumber?.trim(),
      },
    })

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 })
      }
      return NextResponse.json({ error: `회원가입 실패: ${authError.message}` }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: '사용자 생성에 실패했습니다.' }, { status: 500 })
    }

    // 프로필 생성/업데이트
    await new Promise(resolve => setTimeout(resolve, 500))

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          name: name?.trim() || null,
          employee_number: employeeNumber?.trim() || null,
          company: company?.trim() || null,
          team: team?.trim() || null,
          position: position?.trim() || null,
          status: 'pending',
        })
        .eq('id', authData.user.id)
    } else {
      await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          name: name?.trim() || null,
          employee_number: employeeNumber?.trim() || null,
          company: company?.trim() || null,
          team: team?.trim() || null,
          position: position?.trim() || null,
          status: 'pending',
        })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[회원가입 API] 예외:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
