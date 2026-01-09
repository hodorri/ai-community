import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    // 먼저 일반 클라이언트로 인증 확인
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const serverSupabase = await createServerClient()
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // 토큰으로 직접 사용자 확인
      const { data: { user: tokenUser }, error: tokenError } = await serverSupabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
      } else {
        authError = tokenError
      }
    } else {
      // 쿠키에서 인증 정보 가져오기
      const { data: { user: cookieUser }, error: cookieError } = await serverSupabase.auth.getUser()
      user = cookieUser
      authError = cookieError
    }

    if (authError) {
      console.error('[파일 업로드] 인증 오류:', authError)
      return NextResponse.json({ error: `인증 오류: ${authError.message}` }, { status: 401 })
    }

    if (!user) {
      console.error('[파일 업로드] 사용자 정보 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('[파일 업로드] 인증된 사용자:', user.email)

    // 서비스 롤 키로 클라이언트 생성 (RLS 우회)
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[파일 업로드] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    console.log('[파일 업로드] 파일 정보:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })

    // 빈 파일 체크
    if (file.size === 0) {
      return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다.' }, { status: 400 })
    }

    // 파일 크기 제한 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 50MB 이하여야 합니다.' }, { status: 400 })
    }

    // 파일 확장자 추출 (확장자가 없어도 업로드 가능하도록 처리)
    const fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'file'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    console.log('[파일 업로드] 업로드할 파일명:', fileName, '확장자:', fileExt)
    const fileBuffer = await file.arrayBuffer()

    // 파일 업로드용 버킷 사용 (avatars 버킷을 파일 저장소로도 사용)
    const bucketName = 'avatars'

    // contentType이 없거나 빈 문자열인 경우 'application/octet-stream'으로 설정
    const contentType = file.type || 'application/octet-stream'

    console.log('[파일 업로드] Storage 업로드 시작:', { bucketName, fileName, contentType })

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: contentType,
        upsert: false,
      })

    if (error) {
      console.error('[파일 업로드] Storage upload error:', error)
      console.error('[파일 업로드] Error details:', JSON.stringify(error, null, 2))
      // 에러 메시지를 더 자세히 반환
      return NextResponse.json({ 
        error: `파일 업로드에 실패했습니다: ${error.message || JSON.stringify(error)}`,
        details: error
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '파일 업로드 데이터를 받지 못했습니다.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    if (!publicUrl) {
      return NextResponse.json({ error: '파일 URL을 생성하지 못했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: `서버 오류가 발생했습니다: ${errorMessage}` }, { status: 500 })
  }
}
