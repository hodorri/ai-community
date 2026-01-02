'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import CommentList from './CommentList'
import CommentForm from './CommentForm'
import type { Comment } from '@/lib/types/database'

interface CommentSectionProps {
  postId: string
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = async () => {
    try {
      // 클라이언트에서 직접 Supabase 사용
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // 먼저 댓글만 조회
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
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
          }
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
  }, [postId])

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
    <div className="bg-white pt-6">
      {/* 댓글 입력창 */}
      {user ? (
        <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />
      ) : (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl text-center text-gray-600">
          댓글을 작성하려면 <a href="/login" className="text-ok-primary hover:underline">로그인</a>이 필요합니다.
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : comments.length > 0 ? (
        <div className="mt-6">
          <CommentList
            comments={comments}
            currentUserId={user?.id}
            postId={postId}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
          />
        </div>
      ) : null}
    </div>
  )
}
