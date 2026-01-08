import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[API] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. RLS 정책에 따라 동작할 수 있습니다.')
}

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인 (디버깅용)
    const envCheck = {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      urlLength: SUPABASE_URL?.length || 0,
      serviceKeyLength: SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      urlPrefix: SUPABASE_URL?.substring(0, 20) || '없음',
      serviceKeyPrefix: SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || '없음'
    }
    console.log('[API] 환경 변수 확인:', envCheck)

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
      return NextResponse.json({ 
        error: 'userId와 email이 필요합니다.',
        received: { userId: !!userId, email: !!email }
      }, { status: 400 })
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
        details: '배포 환경의 환경 변수 설정을 확인해주세요. Vercel 대시보드 > Project Settings > Environment Variables에서 SUPABASE_SERVICE_ROLE_KEY를 추가한 후 재배포해야 합니다.',
        hint: '이 키는 Supabase 대시보드 > Settings > API에서 확인할 수 있습니다. 환경 변수를 추가한 후 반드시 재배포해야 합니다!',
        envCheck
      }, { status: 500 })
    }

    if (!SUPABASE_URL) {
      console.error('[API] NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.')
      return NextResponse.json({ 
        error: '서버 설정 오류: NEXT_PUBLIC_SUPABASE_URL이 필요합니다.',
        details: '환경 변수를 확인해주세요.',
        envCheck
      }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 프로필이 이미 존재하는지 확인 (트리거가 생성했을 수도 있음)
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

      if (error) {
        console.error('[API] 프로필 업데이트 오류:', error)
        console.error('[API] 업데이트 시도 데이터:', {
          userId,
          updateData: {
            name: cleanName,
            employee_number: cleanEmployeeNumber,
            company: cleanCompany,
            team: cleanTeam,
            position: cleanPosition,
            status: 'pending',
          }
        })
        return NextResponse.json({ 
          error: '프로필 업데이트에 실패했습니다.',
          details: error.message,
          code: error.code,
          hint: error.hint
        }, { status: 500 })
      }

      if (!data || data.length === 0) {
        console.error('[API] 프로필 업데이트 결과 없음')
        return NextResponse.json({ 
          error: '프로필 업데이트 결과를 찾을 수 없습니다.',
          details: '업데이트는 성공했지만 결과를 가져오지 못했습니다.'
        }, { status: 500 })
      }

      result = data[0]
    } else {
      // 생성
      console.log('[API] 프로필 생성 시도')
      
      // 외래 키 제약 조건 오류를 위한 재시도 로직
      let insertSuccess = false
      let insertError: any = null
      let insertRetryCount = 0
      const maxInsertRetries = 3
      const insertRetryDelay = 1000 // 1초

      while (!insertSuccess && insertRetryCount < maxInsertRetries) {
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

        if (error) {
          console.error(`[API] 프로필 생성 오류 (시도 ${insertRetryCount + 1}/${maxInsertRetries}):`, error)
          
          // 외래 키 제약 조건 오류 (23503)인 경우 재시도
          if (error.code === '23503' && insertRetryCount < maxInsertRetries - 1) {
            console.log(`[API] 외래 키 제약 조건 오류 감지, ${insertRetryDelay}ms 후 재시도...`)
            insertError = error
            insertRetryCount++
            await new Promise(resolve => setTimeout(resolve, insertRetryDelay))
            continue
          } else {
            insertError = error
            console.error('[API] 생성 시도 데이터:', {
              id: userId,
              email,
              name: cleanName,
              employee_number: cleanEmployeeNumber,
              company: cleanCompany,
              team: cleanTeam,
              position: cleanPosition,
              status: 'pending',
            })
            return NextResponse.json({ 
              error: '프로필 생성에 실패했습니다.',
              details: error.message,
              code: error.code,
              hint: error.code === '23503' 
                ? 'auth.users 테이블에 사용자가 아직 생성되지 않았습니다. 회원가입이 완료될 때까지 잠시 기다려주세요.' 
                : error.hint
            }, { status: 500 })
          }
        } else {
          insertSuccess = true
          
          if (!data || data.length === 0) {
            console.error('[API] 프로필 생성 결과 없음')
            return NextResponse.json({ 
              error: '프로필 생성 결과를 찾을 수 없습니다.',
              details: '생성은 성공했지만 결과를 가져오지 못했습니다.'
            }, { status: 500 })
          }

          result = data[0]
          break
        }
      }

      if (!insertSuccess) {
        return NextResponse.json({ 
          error: '프로필 생성에 실패했습니다.',
          details: insertError?.message || '알 수 없는 오류',
          code: insertError?.code,
          hint: insertError?.hint || '최대 재시도 횟수를 초과했습니다.'
        }, { status: 500 })
      }

    }

    console.log('[API] 프로필 저장 성공:', result)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[API] 프로필 저장 예외:', error)
    console.error('[API] 예외 스택:', error.stack)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message || '알 수 없는 오류',
      type: error.name || 'UnknownError'
    }, { status: 500 })
  }
}
