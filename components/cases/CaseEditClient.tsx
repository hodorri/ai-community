'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function isImageUrl(url?: string | null): boolean {
  if (!url) return false
  const lowered = url.toLowerCase()
  return lowered.endsWith('.png') || lowered.endsWith('.jpg') || lowered.endsWith('.jpeg') || lowered.endsWith('.gif') || lowered.endsWith('.webp')
}

export default function CaseEditClient({ caseId }: { caseId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [form, setForm] = useState<any>({
    title: '',
    content: '',
    author_name: '',
    ai_engineer_cohort: '',
    leading_role: '',
    activity_details: '',
    ai_usage_level: '',
    ai_usage_evaluation_reason: '',
    output_name: '',
    ai_tools: '',
    development_background: '',
    features: '',
    usage_effects: '',
    development_level_evaluation_reason: '',
    submission_format: '',
    attached_file_name: '',
    attached_file_size: '',
    attached_file_url: '',
    attached_file_mime: '',
    source_url: '',
  })

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        const admin = (user?.email || '') === ADMIN_EMAIL
        setIsAdmin(admin)

        if (!user) {
          router.push('/login')
          return
        }
        if (!admin) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('ai_cases')
          .select('*')
          .eq('id', caseId)
          .single()

        if (error) {
          console.error('[CaseEditClient] 데이터 조회 오류:', error)
          throw error
        }
        if (!data) throw new Error('AI 활용사례를 찾을 수 없습니다.')

        console.log('[CaseEditClient] 전체 데이터:', data)
        console.log('[CaseEditClient] ai_tools 값:', data.ai_tools)
        console.log('[CaseEditClient] usage_effects 값:', data.usage_effects)
        console.log('[CaseEditClient] submission_format 값:', data.submission_format)

        setForm({
          title: data.title ?? '',
          content: data.content ?? '',
          author_name: data.author_name ?? '',
          ai_engineer_cohort: data.ai_engineer_cohort ?? '',
          ai_tools: data.ai_tools ?? '',
          leading_role: data.leading_role ?? '',
          activity_details: data.activity_details ?? '',
          ai_usage_level: data.ai_usage_level ?? '',
          ai_usage_evaluation_reason: data.ai_usage_evaluation_reason ?? '',
          output_name: data.output_name ?? '',
          development_background: data.development_background ?? '',
          features: data.features ?? '',
          usage_effects: data.usage_effects ?? '',
          development_level_evaluation_reason: data.development_level_evaluation_reason ?? '',
          submission_format: data.submission_format ?? '',
          attached_file_url: data.attached_file_url || data.source_url || '',
          attached_file_mime: data.attached_file_mime ?? '',
          attached_file_name: data.attached_file_name ?? '',
          attached_file_size: data.attached_file_size ?? '',
          source_url: data.source_url ?? '',
        })

        console.log('[CaseEditClient] setForm 후 form.ai_tools:', data.ai_tools ?? '')
      } catch (e) {
        console.error('AI 활용사례 편집 로드 오류:', e)
      } finally {
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  const attachmentPreviewUrl = useMemo(() => {
    const url = (form.attached_file_url || '').trim()
    return url || null
  }, [form.attached_file_url])

  const onUploadFile = async (file: File) => {
    try {
      console.log('[파일 업로드] onUploadFile 호출됨:', file.name, file.size, file.type)
      setUploading(true)
      
      // 사용자 인증 확인 및 세션 토큰 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        console.error('[파일 업로드] 사용자 인증 실패:', userError)
        alert('로그인이 필요합니다. 페이지를 새로고침한 후 다시 시도해주세요.')
        return
      }

      console.log('[파일 업로드] 사용자 인증 성공:', user.email)

      // 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session || sessionError) {
        console.error('[파일 업로드] 세션 가져오기 실패:', sessionError)
        alert('세션이 만료되었습니다. 다시 로그인해주세요.')
        return
      }

      console.log('[파일 업로드] 세션 토큰 획득 성공')

      const fd = new FormData()
      fd.append('file', file)

      // Authorization 헤더에 토큰 추가
      const headers: HeadersInit = {}
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      let res: Response
      try {
        res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: fd,
        })
      } catch (fetchError) {
        console.error('Fetch 오류:', fetchError)
        const errorMessage = fetchError instanceof Error 
          ? `네트워크 오류: ${fetchError.message}` 
          : '네트워크 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'
        alert(`파일 업로드 실패: ${errorMessage}`)
        throw new Error(errorMessage)
      }

      let result: any = {}
      try {
        result = await res.json()
      } catch (jsonError) {
        console.error('JSON 파싱 오류:', jsonError)
        const errorMessage = `서버 응답을 읽을 수 없습니다. (HTTP ${res.status})`
        alert(`파일 업로드 실패: ${errorMessage}`)
        throw new Error(errorMessage)
      }

      if (!res.ok) {
        const errorMessage = result.error || `HTTP ${res.status}: 파일 업로드에 실패했습니다.`
        console.error('파일 업로드 오류:', errorMessage, result)
        console.error('응답 상태:', res.status, res.statusText)
        alert(`파일 업로드 실패: ${errorMessage}`)
        throw new Error(errorMessage)
      }

      if (!result.url) {
        throw new Error('업로드된 파일의 URL을 받지 못했습니다.')
      }

      setForm((prev: any) => ({
        ...prev,
        attached_file_url: result.url,
        attached_file_mime: file.type || '',
        attached_file_name: file.name || prev.attached_file_name,
        attached_file_size: formatBytes(file.size) || prev.attached_file_size,
      }))
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      alert(`파일 업로드 실패: ${errorMessage}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!isAdmin) return
    if (!form.title?.trim()) {
      alert('제목은 필수입니다.')
      return
    }

    try {
      setSaving(true)
      const updateData: any = {
        title: form.title?.trim(),
        content: form.content || '',
        author_name: form.author_name?.trim() || null,
        ai_engineer_cohort: form.ai_engineer_cohort?.trim() || null,
        leading_role: form.leading_role || null,
        activity_details: form.activity_details || null,
        ai_usage_level: form.ai_usage_level || null,
        ai_usage_evaluation_reason: form.ai_usage_evaluation_reason || null,
        output_name: form.output_name || null,
        ai_tools: form.ai_tools || null,
        development_background: form.development_background || null,
        features: form.features || null,
        usage_effects: form.usage_effects || null,
        development_level_evaluation_reason: form.development_level_evaluation_reason || null,
        submission_format: form.submission_format || null,
        attached_file_name: form.attached_file_name || null,
        attached_file_size: form.attached_file_size || null,
        attached_file_url: form.attached_file_url || null,
        attached_file_mime: form.attached_file_mime || null,
        source_url: form.source_url || null,
      }

      const { error } = await supabase
        .from('ai_cases')
        .update(updateData)
        .eq('id', caseId)

      if (error) throw error

      alert('저장되었습니다.')
      window.dispatchEvent(new CustomEvent('cases-updated'))
      router.push(`/cases/${caseId}`)
      router.refresh()
    } catch (e: any) {
      console.error('AI 활용사례 저장 오류:', e)
      alert(`저장 실패: ${e?.message || '알 수 없는 오류'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
            <p className="text-red-700 font-semibold mb-2">권한이 없습니다</p>
            <p className="text-red-600 text-sm">관리자만 수정할 수 있습니다.</p>
            <button
              onClick={() => router.push(`/cases/${caseId}`)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">AI 활용사례 수정</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/cases/${caseId}`)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-ok-primary text-white hover:bg-ok-dark'
              }`}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p: any) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ok-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">AI Engineer명</label>
            <input
              value={form.author_name || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, author_name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ok-primary"
              placeholder="작성자 이름을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">AI Engineer 기수</label>
            <input
              value={form.ai_engineer_cohort || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, ai_engineer_cohort: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ok-primary"
              placeholder="예: 1기, 2기, 3기 등"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p: any) => ({ ...p, content: e.target.value }))}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ok-primary whitespace-pre-wrap"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">리딩역할</label>
              <input
                value={form.leading_role || ''}
                onChange={(e) => setForm((p: any) => ({ ...p, leading_role: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">AI활용수준</label>
              <select
                value={form.ai_usage_level || ''}
                onChange={(e) => setForm((p: any) => ({ ...p, ai_usage_level: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ok-primary"
              >
                <option value="">선택하세요</option>
                <option value="기초">기초</option>
                <option value="중급">중급</option>
                <option value="고급">고급</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">사용 AI 도구</label>
            <input
              value={form.ai_tools || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, ai_tools: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">개발배경</label>
            <textarea
              value={form.development_background || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, development_background: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg whitespace-pre-wrap"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">기능</label>
            <textarea
              value={form.features || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, features: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg whitespace-pre-wrap"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">사용효과</label>
            <textarea
              value={form.usage_effects || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, usage_effects: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg whitespace-pre-wrap"
            />
          </div>
        </div>

        {/* 첨부파일 */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">첨부파일</h2>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="*/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  console.log('[파일 업로드] 파일 선택됨:', file?.name, file?.type, file?.size)
                  if (file) {
                    onUploadFile(file)
                  }
                }}
                disabled={uploading}
                id="case-attach-file"
              />
              <button
                type="button"
                onClick={() => {
                  if (uploading) {
                    console.log('[파일 업로드] 업로드 중이므로 클릭 무시')
                    return
                  }
                  console.log('[파일 업로드] 버튼 클릭됨, 파일 선택 다이얼로그 열기')
                  if (fileRef.current) {
                    fileRef.current.disabled = false
                    fileRef.current.click()
                  } else {
                    console.error('[파일 업로드] fileRef.current가 null입니다')
                  }
                }}
                disabled={uploading}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  uploading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {uploading ? '업로드 중...' : '파일 업로드'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">첨부 URL</label>
            <input
              value={form.attached_file_url || ''}
              onChange={(e) => setForm((p: any) => ({ ...p, attached_file_url: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500 mt-2">링크 또는 이미지 URL을 넣을 수 있습니다.</p>
          </div>


          {attachmentPreviewUrl && isImageUrl(attachmentPreviewUrl) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <img
                src={attachmentPreviewUrl}
                alt={form.attached_file_name || '첨부 이미지'}
                className="max-w-full rounded-lg border border-gray-200"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

