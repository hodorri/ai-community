import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 토큰으로 Supabase 클라이언트 생성 (뉴스 저장과 동일한 방식)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 사용자 정보 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('[AI 활용사례 저장] 인증 오류:', userError)
      return NextResponse.json({ error: '인증 오류: ' + (userError?.message || '사용자 정보를 가져올 수 없습니다.') }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { caseItems } = body

    if (!caseItems || !Array.isArray(caseItems) || caseItems.length === 0) {
      return NextResponse.json({ error: '저장할 사례가 없습니다.' }, { status: 400 })
    }

    // ai_cases 테이블에 저장
    const savedCases = []
    const skippedCases = []
    const errors: string[] = []

    for (const item of caseItems) {
      try {
        // 필수 필드 체크
        if (!item.title || item.title.trim() === '') {
          errors.push(`제목이 없는 항목을 건너뜁니다.`)
          continue
        }

        const titleValue = item.title.trim()
        const contentValue = (item.content || item.activityDetails || '').trim() || '내용 없음'
        
        if (!titleValue) {
          errors.push(`제목이 비어있는 항목을 건너뜁니다.`)
          continue
        }

        // 중복 체크 (업로드 API와 동일한 로직)
        let existing = null
        
        const authorName = (item.authorName || '').trim()
        const title = item.title.trim()
        
        console.log(`[저장 중복 체크 시작] ${authorName} - ${title}`)
        console.log(`[저장 항목 정보] external_id: ${item.external_id}, sourceUrl: ${item.sourceUrl}`)
        
        // 업로드 API에서 전달받은 external_id 우선 사용
        let externalId = item.external_id
        
        // external_id가 없으면 생성 (업로드 API와 동일한 방식)
        if (!externalId) {
          if (item.sourceUrl) {
            externalId = item.sourceUrl.split('/').pop() || item.sourceUrl
          } else if (authorName && title) {
            // 이름과 제목 조합으로 일관된 external_id 생성 (업로드 API와 동일)
            const namePart = authorName.replace(/\s+/g, '_').toLowerCase()
            const titlePart = title.substring(0, 50).replace(/\s+/g, '_').toLowerCase()
            externalId = `${namePart}_${titlePart}`
          }
        }
        
        console.log(`[저장 external_id] ${externalId}`)
        
        // 1순위: 이름+제목 조합으로 확인 (가장 정확함)
        if (authorName && title) {
          const { data: existingByNameTitle, error: nameTitleError } = await supabase
            .from('ai_cases')
            .select('id, author_name, title, external_id')
            .eq('author_name', authorName)
            .eq('title', title)
            .maybeSingle()
          
          if (nameTitleError) {
            console.error(`[저장 중복 체크 오류 - 이름+제목]`, nameTitleError)
          }
          
          if (existingByNameTitle) {
            existing = existingByNameTitle
            console.log(`[저장 중복 발견 - 이름+제목] ${authorName} - ${title} (ID: ${existingByNameTitle.id}, external_id: ${existingByNameTitle.external_id})`)
          } else {
            console.log(`[저장 중복 아님 - 이름+제목] ${authorName} - ${title}`)
          }
        }
        
        // 2순위: external_id로 확인 (이름+제목으로 중복이 아니지만 external_id가 이미 존재하는 경우)
        if (!existing && externalId) {
          const { data: existingById, error: idError } = await supabase
            .from('ai_cases')
            .select('id, author_name, title, external_id')
            .eq('external_id', externalId)
            .maybeSingle()
          
          if (idError) {
            console.error(`[저장 중복 체크 오류 - external_id]`, idError)
          }
          
          if (existingById) {
            // external_id는 같지만 이름이나 제목이 다르면 새 항목으로 처리
            const isSameContent = existingById.author_name === authorName && existingById.title === title
            if (isSameContent) {
              existing = existingById
              console.log(`[저장 중복 발견 - external_id] ${externalId} (ID: ${existingById.id})`)
            } else {
              // external_id가 같지만 내용이 다르면 새로운 external_id 생성
              const namePart = authorName.replace(/\s+/g, '_').toLowerCase()
              const titlePart = title.substring(0, 50).replace(/\s+/g, '_').toLowerCase()
              externalId = `${namePart}_${titlePart}_${Date.now()}`
              console.log(`[저장 external_id 충돌 - 새로 생성] ${externalId}`)
            }
          } else {
            console.log(`[저장 중복 아님 - external_id] ${externalId}`)
          }
        }
        
        if (!existing) {
          console.log(`[저장 최종 판정: 중복 아님] ${authorName} - ${title} (external_id: ${externalId})`)
        }

        if (existing) {
          skippedCases.push(item.title)
          continue
        }

        // 날짜 파싱
        let publishedAtDate: string | null = null
        if (item.publishedAt) {
          try {
            const dateStr = item.publishedAt.replace(/\./g, '-').replace(/오전|오후/g, '').trim()
            const parsedDate = new Date(dateStr)
            if (!isNaN(parsedDate.getTime())) {
              publishedAtDate = parsedDate.toISOString()
            } else {
              publishedAtDate = item.publishedAt
            }
          } catch {
            publishedAtDate = item.publishedAt
          }
        }

        // external_id가 없으면 새로 생성 (위에서 중복 체크 시 이미 생성했지만, 혹시 없을 경우 대비)
        if (!externalId) {
          if (item.sourceUrl) {
            externalId = item.sourceUrl.split('/').pop() || item.sourceUrl
          } else if (authorName && title) {
            const namePart = authorName.replace(/\s+/g, '_').toLowerCase()
            const titlePart = title.substring(0, 50).replace(/\s+/g, '_').toLowerCase()
            externalId = `${namePart}_${titlePart}`
            // 중복 가능성이 있으면 타임스탬프 추가
            const { data: checkDuplicate } = await supabase
              .from('ai_cases')
              .select('id')
              .eq('external_id', externalId)
              .maybeSingle()
            
            if (checkDuplicate) {
              externalId = `${externalId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            }
          } else {
            externalId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          }
        }

        // ai_cases 테이블에 삽입
        // attached_file_url이 없으면 source_url을 사용
        const attachedFileUrl = item.attachedFileUrl || item.sourceUrl || null
        
        const insertData: any = {
          external_id: externalId,
          title: titleValue,
          content: contentValue,
          source_url: item.sourceUrl || null,
          author_name: authorName || null,
          author_email: item.authorEmail || null,
          employee_number: item.employeeNumber || null,
          leading_role: item.leadingRole || null,
          activity_details: item.activityDetails || null,
          ai_usage_level: item.aiUsageLevel || null,
          ai_usage_evaluation_reason: item.aiUsageEvaluationReason || null,
          output_name: item.outputName || null,
          ai_tools: item.aiTools || null,
          development_background: item.developmentBackground || null,
          features: item.features || null,
          usage_effects: item.usageEffects || null,
          development_level_evaluation_reason: item.developmentLevelEvaluationReason || null,
          submission_format: item.submissionFormat || null,
          attached_file_url: attachedFileUrl,
          attached_file_name: item.attachedFileName || null,
          attached_file_size: item.attachedFileSize || null,
          published_at: publishedAtDate || new Date().toISOString(),
          imported_by: user.id,
        }

        // null 값 제거 (빈 문자열은 유지)
        Object.keys(insertData).forEach(key => {
          if (insertData[key] === null || insertData[key] === undefined) {
            delete insertData[key]
          }
        })

        console.log(`[AI 활용사례 저장] 삽입 시도: ${titleValue}`, { 
          external_id: externalId, 
          title: insertData.title,
          content_length: insertData.content?.length || 0
        })

        const { data: inserted, error: insertError } = await supabase
          .from('ai_cases')
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          console.error(`[AI 활용사례 저장] 삽입 오류: ${titleValue}`, insertError)
          console.error(`[AI 활용사례 저장] 삽입 데이터:`, JSON.stringify(insertData, null, 2))
          console.error(`[AI 활용사례 저장] 삽입 오류 상세:`, {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          })
          errors.push(`${titleValue}: ${insertError.message || insertError.code || JSON.stringify(insertError)}`)
          continue
        }

        if (!inserted) {
          console.error(`[AI 활용사례 저장] 삽입 후 데이터 없음: ${titleValue}`)
          errors.push(`${titleValue}: 삽입 후 데이터를 찾을 수 없습니다.`)
          continue
        }

        if (inserted) {
          savedCases.push(inserted)
        }
      } catch (error: any) {
        console.error(`[AI 활용사례 저장] 예외: ${item.title}`, error)
        errors.push(`${item.title}: ${error.message || '알 수 없는 오류'}`)
      }
    }

    console.log(`[AI 활용사례 저장] ${savedCases.length}개 사례 저장 완료, ${skippedCases.length}개 중복 건너뜀`)

    return NextResponse.json({
      success: true,
      saved: savedCases.length,
      skipped: skippedCases.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[AI 활용사례 저장] 오류:', error)
    
    return NextResponse.json(
      { 
        error: 'AI 활용사례 저장 중 오류가 발생했습니다.',
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
