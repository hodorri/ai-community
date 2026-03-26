'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/post/RichTextEditor'
import { earnPoints } from '@/lib/points'
import { Suspense } from 'react'

function NewCopLogForm() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const copId = searchParams.get('copId')
  const [copName, setCopName] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (copId) {
      supabase.from('cops').select('name').eq('id', copId).single().then(({ data }) => {
        if (data) setCopName(data.name)
      })
    }
  }, [user, authLoading, copId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요.')
      return
    }

    if (!copId) {
      setError('CoP 정보��� ��습니다.')
      return
    }

    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('인증이 필요합니다.')

      const { data: newLog, error: insertError } = await supabase
        .from('cop_logs')
        .insert({
          cop_id: copId,
          user_id: authUser.id,
          title,
          content,
          image_urls: [],
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      // 포인트 자동 적립
      await earnPoints(supabase, authUser.id, 'post_create', newLog.id, `CoP 활동일지: ${copName}`)

      router.push(`/cop-log/${newLog.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">로딩 중...</div></div>
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">돌아가기</span>
        </button>
        {copName && <p className="text-sm text-gray-500">📁 {copName} 활동일지</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="title" className="block text-lg font-bold text-gray-900 mb-2">제목</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors text-lg"
            placeholder="활동일지 제목을 입력하세요"
          />
        </div>

        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">내용</label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="활동 내용을 입력하세��."
            minHeight="400px"
          />
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-ok-primary text-white rounded-xl hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-md hover:shadow-lg"
          >
            {loading ? '저장 중...' : '작성하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewCopLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">로딩 중...</div></div>}>
      <NewCopLogForm />
    </Suspense>
  )
}
