import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export interface ExcelCaseItem {
  title: string
  content?: string
  sourceUrl?: string
  authorName?: string
  authorEmail?: string
  employeeNumber?: string
  leadingRole?: string
  activityDetails?: string
  aiUsageLevel?: string
  aiUsageEvaluationReason?: string
  outputName?: string
  aiTools?: string
  developmentBackground?: string
  features?: string
  usageEffects?: string
  developmentLevelEvaluationReason?: string
  submissionFormat?: string
  attachedFileName?: string
  attachedFileSize?: string
  publishedAt?: string
}

// 엑셀 파일 파싱
function parseExcelFile(buffer: Buffer): ExcelCaseItem[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // 엑셀 데이터를 JSON으로 변환 (첫 번째 행을 헤더로 사용)
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '', // 빈 셀은 빈 문자열로
      raw: false, // 날짜를 문자열로 변환
    }) as Array<{ 
      [key: string]: any
    }>
    
    // 헤더 행 제거 (첫 번째 행이 헤더인 경우)
    const filteredData = data.filter((row, index) => {
      // 첫 번째 행이 헤더인 경우 제외
      const firstValue = Object.values(row)[0]
      if (index === 0 && (firstValue === '번호' || firstValue === '제목' || firstValue === 'title')) {
        return false
      }
      // 이름이나 제목이 있는 행만
      const name = String(row['이름'] || row['name'] || row['Name'] || '').trim()
      const title = String(row['제목'] || row['title'] || row['Title'] || '').trim()
      return name || title
    })
    
    // 첫 번째 행의 컬럼명 확인 (디버깅용)
    if (filteredData.length > 0) {
      const firstRow = filteredData[0]
      const columnNames = Object.keys(firstRow)
      console.log('[엑셀 파싱] 발견된 컬럼명:', columnNames)
      console.log('[엑셀 파싱] 첫 번째 행 전체 데이터:', JSON.stringify(firstRow, null, 2))
    }
    
    // ExcelCaseItem 형식으로 변환
    return filteredData.map((row, index) => {
      // 한국어 컬럼명과 영어 컬럼명 모두 지원
      const getValue = (koreanName: string, englishName?: string) => {
        const value = row[koreanName] || row[englishName || ''] || ''
        return String(value).trim() || undefined
      }
      
      // 제목은 산출물명을 우선 사용, 없으면 활동내용 사용
      const title = getValue('산출물명', 'output_name') || getValue('제목', 'title') || getValue('활동내용', 'activity_details') || '제목 없음'
      // 내용은 활동내용 사용
      const content = getValue('활동내용', 'activity_details') || getValue('내용', 'content') || ''
      const authorName = getValue('이름', 'author_name') || getValue('name', 'Name')
      const authorEmail = getValue('이메일', 'author_email') || getValue('email', 'Email')
      // 사번 컬럼명 여러 가지 시도 (엑셀 파일의 실제 컬럼명 확인 필요)
      const employeeNumber = getValue('사번', 'employee_number') 
        || getValue('사원번호', 'employee_id') 
        || getValue('사년', 'employee_number')
        || getValue('사번 ', 'employee_number') // 공백 포함
        || getValue('사번\n', 'employee_number') // 줄바꿈 포함
      
      // 디버깅: 첫 번째 행의 사번 읽기 시도
      if (index === 0) {
        console.log('[엑셀 파싱] 첫 번째 행 사번 읽기 시도:', {
          '사번': row['사번'],
          '사원번호': row['사원번호'],
          '사년': row['사년'],
          'employee_number': row['employee_number'],
          'employee_id': row['employee_id'],
          '최종값': employeeNumber
        })
      }
      const leadingRole = getValue('리딩 역할', 'leading_role') || getValue('리딩역할', 'leading_role')
      const activityDetails = getValue('활동내용', 'activity_details')
      const aiUsageLevel = getValue('AI 활용수준', 'ai_usage_level') || getValue('AI활용수준', 'ai_usage_level')
      const aiUsageEvaluationReason = getValue('AI 활용 평가이유', 'ai_usage_evaluation_reason') || getValue('AI활용평가이유', 'ai_usage_evaluation_reason')
      const outputName = getValue('산출물명', 'output_name')
      const aiTools = getValue('사용 AI툴', 'ai_tools')
        || getValue('사용 AI 툴', 'ai_tools')
        || getValue('사용AI툴', 'ai_tools')
        || getValue('업무 연관 AI 사용 툴', 'ai_tools') 
        || getValue('업무연관 AI 사용 툴', 'ai_tools')
        || getValue('업무연관여누사용 Al', 'ai_tools') 
        || getValue('AI도구', 'ai_tools')
        || getValue('업무 연관 AI 사용 툴 ', 'ai_tools') // 공백 포함
      
      // 디버깅: 첫 번째 행의 ai_tools 읽기 시도
      if (index === 0) {
        console.log('[엑셀 파싱] 첫 번째 행 ai_tools 읽기 시도:', {
          '사용 AI툴': row['사용 AI툴'],
          '사용 AI 툴': row['사용 AI 툴'],
          '사용AI툴': row['사용AI툴'],
          '업무 연관 AI 사용 툴': row['업무 연관 AI 사용 툴'],
          '업무연관 AI 사용 툴': row['업무연관 AI 사용 툴'],
          '업무연관여누사용 Al': row['업무연관여누사용 Al'],
          'AI도구': row['AI도구'],
          'ai_tools': row['ai_tools'],
          '최종값': aiTools
        })
      }
      const developmentBackground = getValue('개발 배경', 'development_background') || getValue('개발배경', 'development_background')
      const features = getValue('기능', 'features')
      const usageEffects = getValue('사용 효과', 'usage_effects') || getValue('사용효과', 'usage_effects')
      const developmentLevelEvaluationReason = getValue('개발 수준 평가이유', 'development_level_evaluation_reason') || getValue('개발수준 평가이유', 'development_level_evaluation_reason')
      const submissionFormat = getValue('제출 형식', 'submission_format') || getValue('제출형식', 'submission_format')
      const attachedFileName = getValue('첨부 파일명', 'attached_file_name') || getValue('첨부파일명', 'attached_file_name')
      const attachedFileSize = getValue('파일 크기', 'attached_file_size') || getValue('파일크기', 'attached_file_size')
      const sourceUrl = getValue('URL', 'url') || getValue('링크', 'link') || getValue('source_url', 'sourceUrl')
      const publishedAt = getValue('제출 일시', 'published_at') || getValue('제출일시', 'published_at') || getValue('제출일', 'submission_date')
      
      return {
        title,
        content: content || activityDetails || '',
        sourceUrl,
        authorName,
        authorEmail,
        employeeNumber,
        leadingRole,
        activityDetails,
        aiUsageLevel,
        aiUsageEvaluationReason,
        outputName,
        aiTools,
        developmentBackground,
        features,
        usageEffects,
        developmentLevelEvaluationReason,
        submissionFormat,
        attachedFileName,
        attachedFileSize,
        publishedAt,
      }
    }).filter(item => item.title && item.title !== '제목 없음') // title이 있는 항목만
  } catch (error) {
    console.error('[엑셀 파싱] 오류:', error)
    throw new Error('엑셀 파일 파싱 중 오류가 발생했습니다.')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabase = await createClient()
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
      } else {
        authError = tokenError
      }
    } else {
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      user = cookieUser
      authError = cookieError
    }

    if (authError) {
      console.error('[엑셀 업로드] 인증 오류:', authError)
      return NextResponse.json({ error: '인증 오류: ' + authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('[엑셀 업로드] 사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (!ADMIN_EMAIL) {
      console.error('[엑셀 업로드] ADMIN_EMAIL이 설정되지 않았습니다.')
      return NextResponse.json({ error: '관리자 설정이 필요합니다.' }, { status: 500 })
    }

    if (user.email !== ADMIN_EMAIL) {
      console.log(`[엑셀 업로드] 관리자 권한 없음: ${user.email} !== ${ADMIN_EMAIL}`)
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // 파일 데이터 가져오기
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 })
    }

    // 파일 확장자 확인
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.' }, { status: 400 })
    }

    console.log('[엑셀 업로드] 파일 수신:', file.name, file.size, 'bytes')

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 엑셀 파일 파싱
    const caseItems = parseExcelFile(buffer)
    
    console.log(`[엑셀 업로드] ${caseItems.length}개 사례 항목 파싱 완료`)

    if (caseItems.length === 0) {
      return NextResponse.json({ error: '엑셀 파일에서 사례 데이터를 찾을 수 없습니다.' }, { status: 400 })
    }

    // 중복 체크만 수행 (ai_cases 테이블에 이미 존재하는 데이터만 중복으로 표시)
    console.log(`[엑셀 업로드] ${caseItems.length}개 항목 중복 체크 시작`)
    
    // 먼저 ai_cases 테이블의 모든 데이터를 가져와서 중복 체크 (성능 개선)
    const { data: allExistingCases, error: fetchError } = await supabase
      .from('ai_cases')
      .select('id, author_name, title, external_id')
    
    if (fetchError) {
      console.error('[엑셀 업로드] 기존 데이터 조회 오류:', fetchError)
    }
    
    const existingCasesMap = new Map<string, any>()
    if (allExistingCases) {
      // 이름+제목 조합으로 맵 생성
      allExistingCases.forEach((existing) => {
        const authorName = (existing.author_name || '').trim()
        const title = (existing.title || '').trim()
        if (authorName && title) {
          const key = `${authorName}|||${title}`
          existingCasesMap.set(key, existing)
        }
        // external_id로도 맵 생성
        if (existing.external_id) {
          existingCasesMap.set(`external_id:${existing.external_id}`, existing)
        }
      })
    }
    
    console.log(`[엑셀 업로드] 기존 데이터 ${allExistingCases?.length || 0}개 조회 완료`)
    
    const casesWithDuplicateCheck = caseItems.map((item, index) => {
      let isDuplicate = false
      
      const authorName = (item.authorName || '').trim()
      const title = (item.title || '').trim()
      
      // external_id 생성 (저장 시 사용)
      let externalId: string
      if (item.sourceUrl && item.sourceUrl.trim()) {
        externalId = item.sourceUrl.split('/').pop() || item.sourceUrl.trim()
      } else if (authorName && title) {
        // 이름과 제목 조합으로 일관된 external_id 생성
        const namePart = authorName.replace(/\s+/g, '_').toLowerCase()
        const titlePart = title.substring(0, 50).replace(/\s+/g, '_').toLowerCase()
        externalId = `${namePart}_${titlePart}`
      } else {
        // 이름이나 제목이 없으면 타임스탬프 기반 ID 생성
        externalId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      }
      
      // 1순위: 이름+제목 조합으로 확인
      if (authorName && title) {
        const key = `${authorName}|||${title}`
        const existing = existingCasesMap.get(key)
        if (existing) {
          isDuplicate = true
          console.log(`[중복 발견 ${index + 1}/${caseItems.length}] 이름+제목: ${authorName} - ${title} (ID: ${existing.id})`)
        }
      }
      
      // 2순위: external_id로 확인 (이름+제목으로 중복이 아니지만 external_id가 이미 존재하는 경우)
      if (!isDuplicate && externalId) {
        const existingByExternalId = existingCasesMap.get(`external_id:${externalId}`)
        if (existingByExternalId) {
          // external_id는 같지만 이름이나 제목이 다르면 새 항목으로 처리 (중복 아님)
          const isSameContent = existingByExternalId.author_name?.trim() === authorName && existingByExternalId.title?.trim() === title
          if (isSameContent) {
            isDuplicate = true
            console.log(`[중복 발견 ${index + 1}/${caseItems.length}] external_id: ${externalId} (ID: ${existingByExternalId.id})`)
          } else {
            console.log(`[중복 아님 ${index + 1}/${caseItems.length}] external_id 충돌이지만 내용 다름: ${externalId}`)
          }
        }
      }
      
      if (!isDuplicate) {
        console.log(`[중복 아님 ${index + 1}/${caseItems.length}] ${authorName} - ${title} (external_id: ${externalId})`)
      }

      return {
        ...item,
        external_id: externalId,
        isDuplicate,
      }
    })
    
    const duplicateCount = casesWithDuplicateCheck.filter(c => c.isDuplicate).length
    console.log(`[엑셀 업로드] 총 ${caseItems.length}개 항목 중 ${duplicateCount}개 중복 발견`)
    
    // 중복 항목 상세 로그
    const duplicates = casesWithDuplicateCheck.filter(c => c.isDuplicate)
    if (duplicates.length > 0) {
      console.log(`[엑셀 업로드] 중복 항목 목록:`)
      duplicates.forEach((dup, idx) => {
        console.log(`  ${idx + 1}. ${dup.authorName} - ${dup.title}`)
      })
    }

    return NextResponse.json({
      success: true,
      total: caseItems.length,
      cases: casesWithDuplicateCheck,
    })
  } catch (error: any) {
    console.error('[엑셀 업로드] 오류:', error)
    
    let errorMessage = '엑셀 파일 업로드 중 오류가 발생했습니다.'
    let errorDetails = error?.message || String(error)
    
    if (errorDetails.includes('파싱')) {
      errorMessage = '엑셀 파일 형식이 올바르지 않습니다. title, content 컬럼이 있는지 확인해주세요.'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails 
      },
      { status: 500 }
    )
  }
}
