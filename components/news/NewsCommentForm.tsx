'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NewsCommentFormProps {
  newsId: string
  parentId?: string | null
  onCommentAdded: () => void
  onCancel?: () => void
}

export default function NewsCommentForm({ newsId, parentId = null, onCommentAdded, onCancel }: NewsCommentFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      router.push('/login')
      return
    }

    if (!content.trim()) {
      alert('댓글 내용을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('news_comments')
        .insert({
          news_id: newsId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
        })

      if (error) {
        throw error
      }

      setContent('')
      onCommentAdded()
      if (onCancel) {
        onCancel()
      }
    } catch (error: any) {
      console.error('댓글 작성 오류:', error)
      alert(error.message || '댓글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentId ? "답글을 입력하세요..." : "귀하의 생각은 무엇입니까?"}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            disabled={loading}
          />
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              취소
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-3 bg-ok-primary text-white rounded-xl font-semibold hover:bg-ok-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !content.trim()}
          >
            {loading ? '작성 중...' : '작성'}
          </button>
        </div>
      </div>
    </form>
  )
}
