'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import GreetingCommentForm from './GreetingCommentForm'
import GreetingCommentList from './GreetingCommentList'
import type { GreetingComment } from '@/lib/types/database'

interface GreetingCommentSectionProps {
  greetingId: string
  onCommentAdded?: () => void
}

export default function GreetingCommentSection({ greetingId, onCommentAdded }: GreetingCommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<GreetingComment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // 댓글 조회
      const { data: commentsData, error: commentsError } = await supabase
        .from('greeting_comments')
        .select('*')
        .eq('greeting_id', greetingId)
        .order('created_at', { ascending: true })
      
      if (commentsError) {
        console.error('댓글 불러오기 오류:', commentsError)
        setComments([])
        setLoading(false)
        return
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      // 각 댓글의 프로필 정보를 별도로 조회
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, name, nickname, avatar_url, company, team, position')
            .eq('id', comment.user_id)
            .maybeSingle()

          return {
            ...comment,
            user: profile ? {
              email: profile.email || null,
              name: profile.name || null,
              nickname: profile.nickname || null,
              avatar_url: profile.avatar_url || null,
              company: profile.company || null,
              team: profile.team || null,
              position: profile.position || null,
            } : {
              email: null,
              name: null,
              nickname: null,
              avatar_url: null,
              company: null,
              team: null,
              position: null,
            },
          } as GreetingComment
        })
      )

      setComments(commentsWithProfiles)
    } catch (error) {
      console.error('댓글 불러오기 오류:', error)
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [greetingId])

  const handleCommentAdded = () => {
    fetchComments()
    if (onCommentAdded) {
      onCommentAdded()
    }
  }

  const handleCommentUpdated = () => {
    fetchComments()
  }

  const handleCommentDeleted = () => {
    fetchComments()
    if (onCommentAdded) {
      onCommentAdded()
    }
  }

  return (
    <div>
      {/* 댓글 입력창 */}
      {user ? (
        <GreetingCommentForm 
          greetingId={greetingId} 
          onCommentAdded={handleCommentAdded} 
        />
      ) : (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl text-center text-gray-600 text-sm">
          댓글을 작성하려면 <a href="/login" className="text-ok-primary hover:underline">로그인</a>이 필요합니다.
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-4 text-gray-500 text-sm">로딩 중...</div>
      ) : comments.length > 0 ? (
        <div className="mt-4">
          <GreetingCommentList
            comments={comments}
            currentUserId={user?.id}
            greetingId={greetingId}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
          />
        </div>
      ) : null}
    </div>
  )
}
