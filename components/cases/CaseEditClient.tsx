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

        if (error) throw error
        if (!data) throw new Error('AI 활용사례를 찾을 수 없습니다.')

        setForm({
          ...form,
          ...data,
          title: data.title || '',
          content: data.content || '',
          author_name: data.author_name || '',
          ai_engineer_cohort: data.ai_engineer_cohort || '',
          attached_file_url: data.attached_file_url || data.source_url || '',
          attached_file_mime: data.attached_file_mime || '',
          attached_file_name: data.attached_file_name || '',
          attached_file_size: data.attached_file_size || '',
          source_url: data.source_url || '',
        })
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

  const onUploadImage = async (file: File) => {
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })

      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}`)
      }

      setForm((prev: any) => ({
        ...prev,
        attached_file_url: result.url,
        attached_file_mime: file.type || '',
        attached_file_name: file.name || prev.attached_file_name,
        attached_file_size: formatBytes(file.size) || prev.attached_file_size,
      }))
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
              <input
                value={form.ai_usage_level || ''}
                onChange={(e) => setForm((p: any) => ({ ...p, ai_usage_level: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
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
            <h2 className="text-lg font-semibold text-gray-900">첨부파일 (링크/이미지)</h2>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onUploadImage(file)
                }}
                disabled={uploading}
                id="case-attach-image"
              />
              <label
                htmlFor="case-attach-image"
                className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                  uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {uploading ? '업로드 중...' : '이미지 업로드'}
              </label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">첨부파일명</label>
              <input
                value={form.attached_file_name || ''}
                onChange={(e) => setForm((p: any) => ({ ...p, attached_file_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">파일크기</label>
              <input
                value={form.attached_file_size || ''}
                onChange={(e) => setForm((p: any) => ({ ...p, attached_file_size: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="예: 24.9 KB"
              />
            </div>
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

