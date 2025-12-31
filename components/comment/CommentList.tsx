'use client'

import { useState } from 'react'
import type { Comment } from '@/lib/types/database'

interface CommentListProps {
  comments: Comment[]
  currentUserId?: string
  onCommentUpdated: () => void
  onCommentDeleted: () => void
}

export default function CommentList({
  comments,
  currentUserId,
  onCommentUpdated,
  onCommentDeleted,
}: CommentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) {
      alert('댓글 내용을 입력해주세요.')
      return
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      })

      if (response.ok) {
        setEditingId(null)
        setEditContent('')
        onCommentUpdated()
      } else {
        alert('댓글 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('댓글 수정 오류:', error)
      alert('오류가 발생했습니다.')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onCommentDeleted()
      } else {
        alert('댓글 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error)
      alert('오류가 발생했습니다.')
    }
  }

  if (comments.length === 0) {
    return <div className="text-center py-8 text-gray-500">아직 댓글이 없습니다.</div>
  }

  return (
    <div className="space-y-4 mt-6">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b pb-4 last:border-b-0">
          {editingId === comment.id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(comment.id)}
                  className="px-4 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user?.email || '익명'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
                {currentUserId === comment.user_id && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(comment)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
