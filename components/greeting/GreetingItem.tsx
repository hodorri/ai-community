'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import GreetingCommentSection from './GreetingCommentSection'
import type { Greeting } from '@/lib/types/database'

interface GreetingItemProps {
  greeting: Greeting
  onUpdate: () => void
}

function getTimeAgo(dateString: string): string {
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
  
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}개월 전`
  
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}년 전`
}

// URL을 링크로 변환하는 컴포넌트
function LinkifyText({ text }: { text: string }) {
  // URL 패턴: http://, https://, www.로 시작하는 URL
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
  
  const parts = text.split(urlRegex)
  
  return (
    <>
      {parts.map((part, index) => {
        // URL인지 확인
        if (part.match(urlRegex)) {
          let url = part
          // www.로 시작하는 경우 http://를 추가
          if (url.startsWith('www.')) {
            url = 'https://' + url
          }
          
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ok-primary hover:text-ok-dark hover:underline break-all"
            >
              {part}
            </a>
          )
        }
        
        // 일반 텍스트는 그대로 반환
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

export default function GreetingItem({ greeting, onUpdate }: GreetingItemProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(greeting.likes_count || 0)
  const [commentsCount, setCommentsCount] = useState(greeting.comments_count || 0)
  const [showComments, setShowComments] = useState((greeting.comments_count || 0) > 0) // 댓글이 있으면 자동으로 펼치기
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const supabase = createClient()

  const authorAvatar = greeting.user?.avatar_url
  const authorName = greeting.user?.nickname || greeting.user?.name || greeting.user?.email?.split('@')[0] || '익명'
  const authorInitial = authorName.charAt(0).toUpperCase()
  const isOwner = user?.id === greeting.user_id

  // 좋아요 상태 확인
  useEffect(() => {
    if (!user) return
    
    const checkLikeStatus = async () => {
      const { data } = await supabase
        .from('greeting_likes')
        .select('id')
        .eq('greeting_id', greeting.id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      setIsLiked(!!data)
    }

    checkLikeStatus()
  }, [user, greeting.id, supabase])

  // 댓글 수 업데이트
  const updateCommentsCount = async () => {
    const { count } = await supabase
      .from('greeting_comments')
      .select('*', { count: 'exact', head: true })
      .eq('greeting_id', greeting.id)
    
    const newCount = count || 0
    setCommentsCount(newCount)
    
    // 댓글이 있으면 자동으로 펼치기
    if (newCount > 0) {
      setShowComments(true)
    }
    
    onUpdate() // 부모 컴포넌트에도 알림
  }

  // 댓글 수가 변경되면 자동으로 펼치기
  useEffect(() => {
    if (commentsCount > 0 && !showComments) {
      setShowComments(true)
    }
  }, [commentsCount])

  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      // 기존 좋아요 확인
      const { data: existingLike } = await supabase
        .from('greeting_likes')
        .select('id')
        .eq('greeting_id', greeting.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingLike) {
        // 좋아요 취소
        await supabase
          .from('greeting_likes')
          .delete()
          .eq('id', existingLike.id)
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        await supabase
          .from('greeting_likes')
          .insert({
            greeting_id: greeting.id,
            user_id: user.id,
          })
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error)
      alert('좋아요 처리에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!confirm('정말 이 가입인사를 삭제하시겠습니까?')) {
      return
    }

    setDeleting(true)
    setShowMenu(false)

    try {
      // 가입인사 삭제 (관련 좋아요와 댓글은 CASCADE로 자동 삭제됨)
      const { error } = await supabase
        .from('greetings')
        .delete()
        .eq('id', greeting.id)
        .eq('user_id', user.id) // 본인 확인

      if (error) {
        throw new Error(error.message || '가입인사 삭제에 실패했습니다.')
      }

      // 목록 새로고침
      onUpdate()
    } catch (error) {
      console.error('가입인사 삭제 오류:', error)
      alert(error instanceof Error ? error.message : '가입인사 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="border-b border-gray-200 py-4 px-4">
      <div className="flex items-start gap-4">
        {/* 프로필 아바타 */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-ok-primary flex items-center justify-center">
          {authorAvatar ? (
            <Image
              src={authorAvatar}
              alt={authorName}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold text-lg">{authorInitial}</span>
          )}
        </div>

        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{authorName}</h3>
              {greeting.user && (greeting.user.company || greeting.user.team || greeting.user.position) && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-xs text-gray-500">
                    {[greeting.user.company, greeting.user.team, greeting.user.position].filter(Boolean).join(' ')}
                  </span>
                </>
              )}
              <span className="text-gray-400">·</span>
              <span className="text-xs text-gray-500">{getTimeAgo(greeting.created_at)}</span>
            </div>
            
            {/* 삭제 버튼 (작성자 본인만) */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  disabled={deleting}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting ? '삭제 중...' : '삭제하기'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap break-words">
            <LinkifyText text={greeting.content} />
          </p>

          {/* 좋아요/댓글 버튼 */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={loading || !user}
              className={`flex items-center gap-1 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isLiked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isLiked ? 'fill-current' : 'fill-none'}`}
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
              <span>{likesCount}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>{commentsCount}</span>
            </button>
          </div>

          {/* 댓글 섹션 */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <GreetingCommentSection 
                greetingId={greeting.id} 
                onCommentAdded={updateCommentsCount}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
