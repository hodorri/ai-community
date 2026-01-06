import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export interface ExcelNewsItem {
  title: string
  content: string
  sourceUrl: string
  sourceSite?: string
  authorName?: string
  imageUrl?: string
  publishedAt?: string
}

// 엑셀 파일 파싱
function parseExcelFile(buffer: Buffer): ExcelNewsItem[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // 엑셀 데이터를 JSON으로 변환 (첫 번째 행을 헤더로 사용)
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '', // 빈 셀은 빈 문자열로
      raw: false, // 날짜를 문자열로 변환
    }) as Array<{ 
      title?: string
      content?: string
      link?: string
      source_site?: string
      author_name?: string
      image_url?: string
      published_at?: string
    }>
    
    // 헤더 행 제거 (첫 번째 행이 헤더인 경우)
    const filteredData = data.filter((row, index) => {
      // 첫 번째 행이 헤더인 경우 제외
      if (index === 0 && (row.title === 'title' || row.title === '제목')) {
        return false
      }
      // title 또는 link가 있는 행만 (대소문자 구분 없이)
      const title = String(row.title || '').trim()
      const link = String(row.link || '').trim()
      return title && link
    })
    
    // ExcelNewsItem 형식으로 변환
    return filteredData.map((row) => {
      const title = String(row.title || '').trim()
      const content = String(row.content || '').trim()
      const link = String(row.link || '').trim()
      const sourceSite = String(row.source_site || '').trim() || '네이버 뉴스'
      const authorName = String(row.author_name || '').trim() || null
      const imageUrl = String(row.image_url || '').trim() || null
      const publishedAt = String(row.published_at || '').trim() || null
      
      return {
        title,
        content,
        sourceUrl: link,
        sourceSite: sourceSite || undefined,
        authorName: authorName || undefined,
        imageUrl: imageUrl || undefined,
        publishedAt: publishedAt || undefined,
      }
    }).filter(item => item.title && item.sourceUrl) // title과 sourceUrl이 있는 항목만
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
    const newsItems = parseExcelFile(buffer)
    
    console.log(`[엑셀 업로드] ${newsItems.length}개 뉴스 항목 파싱 완료`)

    if (newsItems.length === 0) {
      return NextResponse.json({ error: '엑셀 파일에서 뉴스 데이터를 찾을 수 없습니다.' }, { status: 400 })
    }

    // 중복 체크만 수행 (DB에 저장하지 않음)
    const newsWithDuplicateCheck = await Promise.all(
      newsItems.map(async (item) => {
        // 이미 crawled_news에 있는지 확인
        const { data: existingCrawled } = await supabase
          .from('crawled_news')
          .select('id, is_published')
          .eq('source_url', item.sourceUrl)
          .maybeSingle()

        // 이미 news에 게시된 것인지 확인
        const { data: existingNews } = await supabase
          .from('news')
          .select('id')
          .eq('source_url', item.sourceUrl)
          .maybeSingle()

        return {
          ...item,
          isDuplicate: !!existingCrawled || !!existingNews,
          isPublished: !!existingNews || existingCrawled?.is_published || false,
        }
      })
    )

    return NextResponse.json({
      success: true,
      total: newsItems.length,
      news: newsWithDuplicateCheck,
    })
  } catch (error: any) {
    console.error('[엑셀 업로드] 오류:', error)
    
    let errorMessage = '엑셀 파일 업로드 중 오류가 발생했습니다.'
    let errorDetails = error?.message || String(error)
    
    if (errorDetails.includes('파싱')) {
      errorMessage = '엑셀 파일 형식이 올바르지 않습니다. title, content, link 컬럼이 있는지 확인해주세요.'
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
