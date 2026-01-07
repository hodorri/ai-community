import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

// GET: 가이드 내용 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: guideList, error } = await supabase
      .from('guide_content')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('가이드 내용 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const data = guideList && guideList.length > 0 ? guideList[0] : null
    return NextResponse.json({ data })
  } catch (error) {
    console.error('가이드 내용 조회 예외:', error)
    return NextResponse.json(
      { error: '가이드 내용을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 가이드 내용 저장/수정
export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null

    const supabase = await createClient()
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
      } else {
        authError = tokenError
      }
    } else {
      // 쿠키에서 인증 정보 가져오기
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      user = cookieUser
      authError = cookieError
    }

    if (authError) {
      console.error('[가이드 저장] 인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('[가이드 저장] 사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('[가이드 저장] 현재 사용자:', user.email)

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    console.log('[가이드 저장 API] 받은 데이터:', body)
    const { id, title, welcome_title, welcome_content, features, getting_started, tips } = body

    // ID가 있으면 해당 ID로 업데이트, 없으면 새로 생성
    let existingData = null
    if (id) {
      const { data: checkData, error: checkError } = await supabase
        .from('guide_content')
        .select('id')
        .eq('id', id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[가이드 저장 API] ID 확인 오류:', checkError)
        return NextResponse.json({ error: '데이터 확인 오류: ' + checkError.message }, { status: 500 })
      }

      if (checkData) {
        existingData = checkData
      }
    }

    // ID가 없거나 존재하지 않으면 최신 데이터 확인
    if (!existingData) {
      const { data: latestData, error: latestError } = await supabase
        .from('guide_content')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestError) {
        console.error('[가이드 저장 API] 최신 데이터 확인 오류:', latestError)
        return NextResponse.json({ error: '데이터 확인 오류: ' + latestError.message }, { status: 500 })
      }

      existingData = latestData
    }

    // JSONB 필드 검증 및 정리
    const cleanFeatures = Array.isArray(features) 
      ? features.filter((f: any) => f && (f.title || f.description))
      : []
    const cleanGettingStarted = Array.isArray(getting_started)
      ? getting_started.filter((item: any) => item && item.trim())
      : []
    const cleanTips = Array.isArray(tips)
      ? tips.filter((tip: any) => tip && tip.trim())
      : []

    const updateData: any = {
      title: title || 'OKAI 가이드',
      welcome_title: welcome_title || '환영합니다!',
      welcome_content: welcome_content || '',
      features: cleanFeatures,
      getting_started: cleanGettingStarted,
      tips: cleanTips,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    }

    let result
    const targetId = existingData?.id || id
    if (targetId) {
      console.log('[가이드 저장 API] 기존 데이터 업데이트 시도:', targetId)
      console.log('[가이드 저장 API] 업데이트할 데이터:', updateData)
      
      // 기존 데이터 업데이트 (배열로 받기)
      const { data: updatedDataList, error: updateError } = await supabase
        .from('guide_content')
        .update(updateData)
        .eq('id', targetId)
        .select()

      if (updateError) {
        console.error('[가이드 저장 API] 업데이트 오류:', updateError)
        return NextResponse.json({ error: '업데이트 실패: ' + updateError.message }, { status: 500 })
      }

      if (!updatedDataList || updatedDataList.length === 0) {
        console.error('[가이드 저장 API] 업데이트된 데이터 없음')
        result = { ...updateData, id: targetId }
      } else {
        console.log('[가이드 저장 API] 업데이트 성공:', updatedDataList[0])
        result = updatedDataList[0]
      }
    } else {
      console.log('[가이드 저장] 새 데이터 생성 시도')
      
      // 새 데이터 생성 (배열로 받아서 첫 번째 항목 사용)
      const { data: insertResultList, error: insertError } = await supabase
        .from('guide_content')
        .insert(updateData)
        .select('*')

      if (insertError) {
        console.error('[가이드 저장] 생성 오류:', insertError)
        return NextResponse.json({ error: '생성 실패: ' + insertError.message }, { status: 500 })
      }

      if (!insertResultList || insertResultList.length === 0) {
        console.error('[가이드 저장] 생성된 데이터 없음')
        return NextResponse.json({ error: '생성된 데이터를 찾을 수 없습니다.' }, { status: 500 })
      }

      result = insertResultList[0]
    }

    console.log('[가이드 저장] 저장 완료:', result.id)
    return NextResponse.json({ data: result, success: true })
  } catch (error) {
    console.error('가이드 내용 저장 예외:', error)
    return NextResponse.json(
      { error: '가이드 내용을 저장하는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
