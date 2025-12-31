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
      const response = await fetch(`/api/comments?postId=${postId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('댓글 불러오기 오류:', error)
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">댓글 ({comments.length})</h2>

      {user ? (
        <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />
      ) : (
        <div className="mb-4 p-4 bg-gray-50 rounded-md text-center text-gray-600">
          댓글을 작성하려면 <a href="/login" className="text-blue-500 hover:underline">로그인</a>이 필요합니다.
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : (
        <CommentList
          comments={comments}
          currentUserId={user?.id}
          onCommentUpdated={handleCommentUpdated}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </div>
  )
}
