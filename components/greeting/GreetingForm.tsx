'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'

interface GreetingFormProps {
  onSuccess?: () => void
  placeholder?: string
}

export default function GreetingForm({ onSuccess, placeholder = '환영합니다! 간단하게 가입인사를 남겨주세요 :)' }: GreetingFormProps) {
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
      setError('가입인사를 입력해주세요.')
      return
    }

    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      // greetings 테이블에 저장
      const { data: greeting, error: insertError } = await supabase
        .from('greetings')
        .insert({
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('가입인사 작성 오류:', insertError)
        throw new Error(insertError.message || '가입인사 작성에 실패했습니다.')
      }

      setContent('')
      if (onSuccess) {
        onSuccess()
      }
      
      // 페이지 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('greeting-posted'))
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
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          {/* 프로필 아바타 */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-ok-primary flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-lg">{initial}</span>
            )}
          </div>

          {/* 입력 필드 */}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 resize-none text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
            
            {error && (
              <div className="mt-2 text-sm text-red-600">{error}</div>
            )}

            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-6 py-2 bg-ok-primary text-white rounded-lg font-semibold hover:bg-ok-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? '작성 중...' : '작성하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
