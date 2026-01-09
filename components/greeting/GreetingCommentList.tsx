'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { GreetingComment } from '@/lib/types/database'
import GreetingCommentForm from './GreetingCommentForm'

interface GreetingCommentListProps {
  comments: GreetingComment[]
  currentUserId?: string
  greetingId: string
  onCommentUpdated: () => void
  onCommentDeleted: () => void
}

// 시간 경과 계산 함수
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return '방금 전'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`
  return `${Math.floor(diffInSeconds / 31536000)}년 전`
}

// 댓글 아이템 컴포넌트
function GreetingCommentItem({
  comment,
  currentUserId,
  greetingId,
  onCommentUpdated,
  onCommentDeleted,
  allComments,
  level = 0,
}: {
  comment: GreetingComment
  currentUserId?: string
  greetingId: string
  onCommentUpdated: () => void
  onCommentDeleted: () => void
  allComments: GreetingComment[]
  level?: number
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const supabase = createClient()

  const displayName = comment.user?.nickname || comment.user?.name || comment.user?.email?.split('@')[0] || '익명'
  const avatarUrl = comment.user?.avatar_url
  const initial = displayName.charAt(0).toUpperCase()
  const timeAgo = getTimeAgo(new Date(comment.created_at))
  const isOwner = currentUserId === comment.user_id

  // 좋아요 상태 및 개수 조회
  useEffect(() => {
    async function fetchLikes() {
      // 좋아요 개수 조회
      const { count } = await supabase
        .from('greeting_comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', comment.id)
      
      setLikesCount(count || 0)

      // 현재 사용자 좋아요 여부 확인
      if (currentUserId) {
        const { data: likeData } = await supabase
          .from('greeting_comment_likes')
          .select('id')
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId)
          .maybeSingle()
        
        setIsLiked(!!likeData)
      }
    }

    fetchLikes()
  }, [comment.id, currentUserId, supabase])

  const handleLike = async () => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const { data: existingLike } = await supabase
        .from('greeting_comment_likes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (existingLike) {
        // 좋아요 취소
        await supabase
          .from('greeting_comment_likes')
          .delete()
          .eq('id', existingLike.id)
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        await supabase
          .from('greeting_comment_likes')
          .insert({
            comment_id: comment.id,
            user_id: currentUserId,
          })
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('댓글 좋아요 처리 오류:', error)
      alert('좋아요 처리에 실패했습니다.')
    }
  }

  const handleEdit = () => {
    setEditingId(comment.id)
    setEditContent(comment.content)
    setShowMenu(false)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      alert('댓글 내용을 입력해주세요.')
      return
    }

    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const { error } = await supabase
        .from('greeting_comments')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', comment.id)
        .eq('user_id', currentUserId)

      if (error) {
        throw new Error(error.message || '댓글 수정에 실패했습니다.')
      }

      setEditingId(null)
      setEditContent('')
      onCommentUpdated()
    } catch (error) {
      console.error('댓글 수정 오류:', error)
      alert(error instanceof Error ? error.message : '오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const { error } = await supabase
        .from('greeting_comments')
        .delete()
        .eq('id', comment.id)
        .eq('user_id', currentUserId)

      if (error) {
        throw new Error(error.message || '댓글 삭제에 실패했습니다.')
      }

      onCommentDeleted()
    } catch (error) {
      console.error('댓글 삭제 오류:', error)
      alert(error instanceof Error ? error.message : '오류가 발생했습니다.')
    }
  }

  const handleReplyAdded = () => {
    setShowReplyForm(false)
    onCommentUpdated()
  }

  // 답글 목록
  const replies = allComments.filter(c => c.parent_id === comment.id)

  return (
    <div className={`${level > 0 ? 'ml-6 mt-3 border-l-2 border-gray-200 pl-3' : 'mb-4'}`}>
      <div className="flex items-start gap-2">
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

        {/* 댓글 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
          {comment.user && (comment.user.company || comment.user.team || comment.user.position) && (
            <div className="text-xs text-gray-500 mb-1">
              {[comment.user.company, comment.user.team, comment.user.position].filter(Boolean).join(' ')}
            </div>
          )}

          {editingId === comment.id ? (
            <div className="space-y-2 mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs bg-ok-primary text-white rounded-lg hover:bg-ok-dark"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">{comment.content}</p>
              
              {/* 좋아요, 답변 및 메뉴 버튼 */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    isLiked
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-gray-600 hover:text-red-500'
                  }`}
                >
                  <svg
                    className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : 'fill-none'}`}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {likesCount > 0 && <span>{likesCount}</span>}
                </button>
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-xs text-gray-600 hover:text-ok-primary transition-colors"
                >
                  답변
                </button>
                {isOwner && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {showMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 bottom-full mb-2 w-24 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                          <button
                            onClick={handleEdit}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            수정
                          </button>
                          <button
                            onClick={handleDelete}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 답글 입력 폼 */}
              {showReplyForm && (
                <div className="mt-3">
                  <GreetingCommentForm
                    greetingId={greetingId}
                    parentId={comment.id}
                    onCommentAdded={handleReplyAdded}
                    onCancel={() => setShowReplyForm(false)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 답글 목록 */}
      {replies.length > 0 && (
        <div className="ml-2 space-y-3 mt-3">
          {replies.map((reply) => (
            <GreetingCommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              greetingId={greetingId}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              allComments={allComments}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GreetingCommentList({
  comments,
  currentUserId,
  greetingId,
  onCommentUpdated,
  onCommentDeleted,
}: GreetingCommentListProps) {
  // 최상위 댓글만 필터링 (parent_id가 null인 것들)
  const topLevelComments = comments.filter(c => !c.parent_id)

  if (topLevelComments.length === 0) {
    return <div className="text-center py-6 text-gray-500 text-sm">아직 댓글이 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      {topLevelComments.map((comment) => (
        <GreetingCommentItem
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          greetingId={greetingId}
          onCommentUpdated={onCommentUpdated}
          onCommentDeleted={onCommentDeleted}
          allComments={comments}
        />
      ))}
    </div>
  )
}
