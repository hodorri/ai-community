'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface GreetingCommentFormProps {
  greetingId: string
  parentId?: string | null
  onCommentAdded: () => void
  onCancel?: () => void
}

export default function GreetingCommentForm({ greetingId, parentId = null, onCommentAdded, onCancel }: GreetingCommentFormProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError('댓글 내용을 입력해주세요.')
      return
    }

    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      const { error: commentError } = await supabase
        .from('greeting_comments')
        .insert({
          greeting_id: greetingId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
        })

      if (commentError) {
        throw new Error(commentError.message || '댓글 작성에 실패했습니다.')
      }

      setContent('')
      onCommentAdded()
      if (onCancel) {
        onCancel()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const displayName = profile?.nickname || profile?.name || user.email?.split('@')[0] || '사용자'
  const avatarUrl = profile?.avatar_url
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex items-start gap-3">
        {/* 프로필 사진 */}
        {avatarUrl ? (
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-ok-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
            {initial}
          </div>
        )}
        
        {/* 댓글 입력 필드 */}
        <div className="flex-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentId ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
          />
          {error && (
            <div className="mt-1 text-xs text-red-500">{error}</div>
          )}
          {onCancel && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
