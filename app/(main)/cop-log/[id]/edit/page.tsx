'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/post/RichTextEditor'

export default function EditCopLogPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    async function fetchLog() {
      const { data, error } = await supabase
        .from('cop_logs')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        alert('활동일지를 찾을 수 없습니다.')
        router.push('/dashboard?tab=cop-log')
        return
      }

      if (data.user_id !== user!.id) {
        alert('수정 권한이 없습니다.')
        router.push(`/cop-log/${params.id}`)
        return
      }

      setTitle(data.title)
      setContent(data.content)
      setLoading(false)
    }
    fetchLog()
  }, [user, authLoading, params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('cop_logs')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .eq('user_id', user!.id)

      if (error) throw error

      router.push(`/cop-log/${params.id}`)
      router.refresh()
    } catch (err) {
      setError('수정에 실패했습니다.')
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">로딩 중...</div></div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 text-lg"
          />
        </div>
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">내용</label>
          <RichTextEditor content={content} onChange={setContent} placeholder="활동 내용을 입력하세요." minHeight="400px" />
        </div>
        {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold">취소</button>
          <button type="submit" disabled={saving} className="px-6 py-3 bg-ok-primary text-white rounded-xl hover:bg-ok-dark disabled:opacity-50 font-semibold shadow-md">{saving ? '저장 중...' : '수정하기'}</button>
        </div>
      </form>
    </div>
  )
}
