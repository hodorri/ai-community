import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[API] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. RLS 정책에 따라 동작할 수 있습니다.')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, name, employeeNumber, company, team, position } = body

    console.log('[API] 프로필 저장 요청:', { 
      userId, 
      email, 
      name: name?.trim(), 
      employeeNumber: employeeNumber?.trim(), 
      nameLength: name?.length,
      employeeNumberLength: employeeNumber?.length,
      company: company?.trim(), 
      team: team?.trim(), 
      position: position?.trim() 
    })

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId와 email이 필요합니다.' }, { status: 400 })
    }

    // 값 정리 (빈 문자열은 null로 변환)
    const cleanName = name?.trim() || null
    const cleanEmployeeNumber = employeeNumber?.trim() || null
    const cleanCompany = company?.trim() || null
    const cleanTeam = team?.trim() || null
    const cleanPosition = position?.trim() || null

    console.log('[API] 정리된 값:', { 
      cleanName, 
      cleanEmployeeNumber, 
      cleanCompany, 
      cleanTeam, 
      cleanPosition 
    })

    // 서비스 롤 키 필수 (RLS 정책 우회)
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
      return NextResponse.json({ 
        error: '서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY가 필요합니다.',
        details: '환경 변수를 확인해주세요.'
      }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 프로필이 이미 존재하는지 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    let result
    if (existingProfile) {
      // 업데이트
      console.log('[API] 프로필 업데이트 시도')
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: cleanName,
          employee_number: cleanEmployeeNumber,
          company: cleanCompany,
          team: cleanTeam,
          position: cleanPosition,
          status: 'pending',
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('[API] 프로필 업데이트 오류:', error)
        return NextResponse.json({ 
          error: '프로필 업데이트에 실패했습니다.',
          details: error.message 
        }, { status: 500 })
      }
      result = data
    } else {
      // 생성
      console.log('[API] 프로필 생성 시도')
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          name: cleanName,
          employee_number: cleanEmployeeNumber,
          company: cleanCompany,
          team: cleanTeam,
          position: cleanPosition,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('[API] 프로필 생성 오류:', error)
        return NextResponse.json({ 
          error: '프로필 생성에 실패했습니다.',
          details: error.message 
        }, { status: 500 })
      }
      result = data
    }

    console.log('[API] 프로필 저장 성공:', result)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[API] 프로필 저장 예외:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message 
    }, { status: 500 })
  }
}
