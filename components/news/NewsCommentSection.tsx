'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import NewsCommentList from './NewsCommentList'
import NewsCommentForm from './NewsCommentForm'
import type { NewsComment } from '@/lib/types/database'

interface NewsCommentSectionProps {
  newsId: string
}

export default function NewsCommentSection({ newsId }: NewsCommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<NewsComment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = async () => {
    try {
      // 클라이언트에서 직접 Supabase 사용
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // 먼저 댓글만 조회
      const { data: commentsData, error: commentsError } = await supabase
        .from('news_comments')
        .select('*')
        .eq('news_id', newsId)
        .order('created_at', { ascending: true })
      
      if (commentsError) {
        console.error('댓글 조회 오류:', commentsError)
        setComments([])
        setLoading(false)
        return
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      // 각 댓글의 프로필 정보 조회
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, name, nickname, avatar_url, company, team, position')
            .eq('id', comment.user_id)
            .maybeSingle()

          return {
            ...comment,
            user: profile || null,
          } as NewsComment
        })
      )

      setComments(commentsWithProfiles)
    } catch (error) {
      console.error('댓글 조회 예외:', error)
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [newsId])

  const handleCommentAdded = () => {
    fetchComments()
  }

  const handleCommentUpdated = () => {
    fetchComments()
  }

  const handleCommentDeleted = () => {
    fetchComments()
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">댓글</h2>
      
      {/* 댓글 작성 폼 */}
      {user && (
        <NewsCommentForm
          newsId={newsId}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : (
        <NewsCommentList
          comments={comments}
          currentUserId={user?.id}
          newsId={newsId}
          onCommentUpdated={handleCommentUpdated}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </div>
  )
}
