'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/post/RichTextEditor'
import type { Notice } from '@/lib/types/database'

interface NoticeEditorProps {
  notice?: Notice
}

export default function NoticeEditor({ notice }: NoticeEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(notice?.title || '')
  const [content, setContent] = useState(notice?.content || '')
  const [imageUrls, setImageUrls] = useState<string[]>(notice?.image_urls || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('인증이 필요합니다.')
      }

      if (notice) {
        // 수정
        const { data: updatedNotice, error } = await supabase
          .from('notices')
          .update({
            title,
            content,
            image_urls: imageUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notice.id)
          .select()
          .single()

        if (error) throw new Error(error.message || '공지사항 수정에 실패했습니다.')

        router.push(`/notice/${updatedNotice.id}`)
        router.refresh()
      } else {
        // 생성
        const { data: newNotice, error } = await supabase
          .from('notices')
          .insert({
            user_id: user.id,
            title,
            content,
            image_urls: imageUrls,
          })
          .select()
          .single()

        if (error) throw new Error(error.message || '공지사항 작성에 실패했습니다.')

        router.push(`/notice/${newNotice.id}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 제목 */}
      <div>
        <label htmlFor="title" className="block text-lg font-bold text-gray-900 mb-2">
          제목
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors text-lg"
          placeholder="공지사항 제목을 입력하세요"
        />
      </div>

      {/* 본문 */}
      <div>
        <label className="block text-lg font-bold text-gray-900 mb-2">
          내용
        </label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="공지사항 내용을 입력하세요."
          minHeight="400px"
        />
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
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
          {loading ? '저장 중...' : notice ? '수정하기' : '작성하기'}
        </button>
      </div>
    </form>
  )
}
