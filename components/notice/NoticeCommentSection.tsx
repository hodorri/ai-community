'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface NoticeCommentSectionProps {
  noticeId: string
}

export default function NoticeCommentSection({ noticeId }: NoticeCommentSectionProps) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      await fetchComments()
    }
    init()
  }, [noticeId])

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('notice_comments')
        .select('*')
        .eq('notice_id', noticeId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, name, nickname, avatar_url, company, team, position')
            .eq('id', comment.user_id)
            .single()
          return { ...comment, user: profile || {} }
        })
      )

      setComments(commentsWithProfiles)
    } catch (error) {
      console.error('댓글 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUserId) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('notice_comments')
        .insert({
          notice_id: noticeId,
          user_id: currentUserId,
          content: newComment.trim(),
        })

      if (error) throw error

      setNewComment('')
      await fetchComments()
    } catch (error) {
      console.error('댓글 작성 오류:', error)
      alert('댓글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !currentUserId) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('notice_comments')
        .insert({
          notice_id: noticeId,
          user_id: currentUserId,
          content: replyContent.trim(),
          parent_id: parentId,
        })

      if (error) throw error

      setReplyContent('')
      setReplyingTo(null)
      await fetchComments()
    } catch (error) {
      console.error('답글 작성 오류:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const { error } = await supabase
        .from('notice_comments')
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', currentUserId)

      if (error) throw error

      setEditingId(null)
      setEditContent('')
      await fetchComments()
    } catch (error) {
      console.error('댓글 수정 오류:', error)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('notice_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId)

      if (error) throw error

      await fetchComments()
    } catch (error) {
      console.error('댓글 삭제 오류:', error)
    }
  }

  const getTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 30) return `${diffDays}일 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  }

  // 부모 댓글과 대댓글 분리
  const parentComments = comments.filter(c => !c.parent_id)
  const childComments = comments.filter(c => c.parent_id)

  if (loading) {
    return <div className="py-4 text-gray-500 text-center">댓글 로딩 중...</div>
  }

  return (
    <div className="py-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">댓글 {comments.length}개</h3>

      {/* 댓글 입력 */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-ok-primary text-white rounded-lg hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
            >
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">
          댓글을 작성하려면 로그인이 필요합니다.
        </div>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {parentComments.map((comment) => {
          const displayName = comment.user?.nickname || comment.user?.name || '익명'
          const initial = displayName.charAt(0).toUpperCase()
          const replies = childComments.filter(c => c.parent_id === comment.id)

          return (
            <div key={comment.id}>
              <div className="flex items-start gap-3">
                {comment.user?.avatar_url ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={comment.user.avatar_url} alt={displayName} fill className="object-cover" sizes="40px" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
                    {initial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{displayName}</span>
                    <span className="text-xs text-gray-500">{getTimeAgo(comment.created_at)}</span>
                  </div>

                  {editingId === comment.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleEdit(comment.id)} className="text-xs text-ok-primary font-semibold">저장</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">취소</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.content}</p>
                  )}

                  <div className="flex items-center gap-3 mt-1">
                    {currentUserId && (
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyContent('') }}
                        className="text-xs text-gray-500 hover:text-ok-primary"
                      >
                        답글
                      </button>
                    )}
                    {currentUserId === comment.user_id && (
                      <>
                        <button
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                          className="text-xs text-gray-500 hover:text-ok-primary"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-gray-500 hover:text-red-500"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>

                  {/* 답글 입력 */}
                  {replyingTo === comment.id && (
                    <div className="mt-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="답글을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={submitting || !replyContent.trim()}
                          className="text-xs text-ok-primary font-semibold disabled:opacity-50"
                        >
                          답글 작성
                        </button>
                        <button onClick={() => setReplyingTo(null)} className="text-xs text-gray-500">취소</button>
                      </div>
                    </div>
                  )}

                  {/* 대댓글 */}
                  {replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-3">
                      {replies.map((reply) => {
                        const replyName = reply.user?.nickname || reply.user?.name || '익명'
                        const replyInitial = replyName.charAt(0).toUpperCase()
                        return (
                          <div key={reply.id} className="flex items-start gap-2">
                            {reply.user?.avatar_url ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                <Image src={reply.user.avatar_url} alt={replyName} fill className="object-cover" sizes="32px" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs flex-shrink-0">
                                {replyInitial}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-gray-900 text-xs">{replyName}</span>
                                <span className="text-xs text-gray-500">{getTimeAgo(reply.created_at)}</span>
                              </div>
                              {editingId === reply.id ? (
                                <div>
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 mt-1">
                                    <button onClick={() => handleEdit(reply.id)} className="text-xs text-ok-primary font-semibold">저장</button>
                                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">취소</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-800 text-xs whitespace-pre-wrap">{reply.content}</p>
                              )}
                              {currentUserId === reply.user_id && editingId !== reply.id && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => { setEditingId(reply.id); setEditContent(reply.content) }}
                                    className="text-xs text-gray-500 hover:text-ok-primary"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDelete(reply.id)}
                                    className="text-xs text-gray-500 hover:text-red-500"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
        </div>
      )}
    </div>
  )
}
