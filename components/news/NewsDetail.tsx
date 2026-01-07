'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { News } from '@/lib/types/database'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

interface NewsDetailProps {
  news: News
  isLiked?: boolean
  currentUserId?: string
  isFromSelectedNews?: boolean
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

export default function NewsDetail({ news: initialNews, isLiked: initialIsLiked = false, currentUserId, isFromSelectedNews = false }: NewsDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [news, setNews] = useState(initialNews)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likesCount, setLikesCount] = useState(news.likes_count || 0)
  const [isPinned, setIsPinned] = useState(news.is_pinned || false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const timeAgo = news.published_at 
    ? getTimeAgo(news.published_at)
    : getTimeAgo(news.created_at)

  // 작성자 정보
  const displayName = news.is_manual && news.user
    ? (news.user.nickname || news.user.name || '익명')
    : (news.author_name || '알 수 없음')
  
  const avatarUrl = news.is_manual && news.user ? news.user.avatar_url : null
  const authorInitial = displayName.charAt(0).toUpperCase()

  const isOwner = user && news.is_manual && news.user_id === user.id
  const isAdmin = currentUserEmail === ADMIN_EMAIL
  // selected_news에서 온 뉴스는 관리자만 수정 가능
  const canEdit = isOwner || (isAdmin && (isFromSelectedNews || !news.is_manual))

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserEmail(user?.email || null)
    }
    
    fetchCurrentUser()
  }, [supabase])

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleTogglePin = async () => {
    if (!isAdmin) return

    try {
      // selected_news에서 온 경우 selected_news 테이블 업데이트, 아니면 news 테이블 업데이트
      const tableName = isFromSelectedNews ? 'selected_news' : 'news'
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_pinned: !isPinned })
        .eq('id', news.id)

      if (error) {
        throw error
      }

      setIsPinned(!isPinned)
      setNews({ ...news, is_pinned: !isPinned })
      setShowMenu(false)
      
      // 뉴스 목록 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('news-updated'))
      
      router.refresh()
    } catch (error) {
      console.error('고정 상태 변경 오류:', error)
      alert(`고정 상태 변경에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    
    if (!confirm('정말로 이 뉴스를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
      return
    }

    try {
      // selected_news에서 온 경우 selected_news 테이블에서 삭제, 아니면 news 테이블에서 삭제
      const tableName = isFromSelectedNews ? 'selected_news' : 'news'
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', news.id)

      if (error) {
        console.error('[뉴스 삭제] 삭제 오류:', error)
        throw error
      }

      alert('뉴스가 삭제되었습니다.')
      setShowMenu(false)
      
      // 뉴스 목록 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('news-updated'))
      
      // 뉴스 목록 페이지로 이동
      router.push('/dashboard?tab=news')
      router.refresh()
    } catch (error: any) {
      console.error('[뉴스 삭제] 삭제 오류:', error)
      alert(`삭제에 실패했습니다: ${error?.message || '알 수 없는 오류'}`)
    }
  }

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }

    try {
      const { data: existingLike } = await supabase
        .from('news_likes')
        .select('id')
        .eq('news_id', news.id)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (existingLike) {
        // 좋아요 취소
        await supabase
          .from('news_likes')
          .delete()
          .eq('id', existingLike.id)
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        await supabase
          .from('news_likes')
          .insert({
            news_id: news.id,
            user_id: currentUserId,
          })
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error)
      alert('좋아요 처리에 실패했습니다.')
    }
  }

  return (
    <div className="p-6 sm:p-8">
      {/* 헤더 - 목록으로 돌아가기, 카테고리, 고정 버튼 및 메뉴 */}
      <div className="relative flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/dashboard?tab=news')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">목록으로</span>
        </button>
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          {isPinned && (
            <span className="text-yellow-500 text-lg" title="고정된 게시물">📌</span>
          )}
          <span className="text-sm text-gray-600">📰 최신 AI 소식</span>
        </div>
        {isAdmin ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={handleTogglePin}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                >
                  {isPinned ? '고정 해제' : '상단 고정'}
                </button>
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      router.push(`/news/${news.id}/edit`)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    수정하기
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                >
                  삭제하기
                </button>
              </div>
            )}
          </div>
        ) : (
          <div></div>
        )}
      </div>

      <div>
        {/* 작성자 정보 */}
      <div className="flex items-center gap-3 mb-6">
        {avatarUrl ? (
          <div className="relative w-12 h-12 rounded-full overflow-hidden">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold">
            {authorInitial}
          </div>
        )}
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{displayName}</div>
          {news.is_manual && news.user && (news.user.company || news.user.team || news.user.name || news.user.position) && (
            <div className="text-xs text-gray-500 mt-0.5">
              {[news.user.company, news.user.team, news.user.name, news.user.position].filter(Boolean).join(' ')}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {timeAgo}
            {news.source_site && ` · ${news.source_site}`}
            {news.is_manual && ' · 최신 AI 소식에 게시됨'}
          </div>
        </div>
      </div>

      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-8 text-gray-900 leading-tight">{news.title}</h1>

      {/* 출처 링크 (크롤링된 경우) */}
      {news.source_url && (
        <div className="mb-6">
          <a
            href={news.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ok-primary hover:text-ok-dark text-sm underline"
          >
            원문 보기 →
          </a>
        </div>
      )}

      {/* 본문 내용 */}
      <div 
        className="prose prose-lg max-w-none mb-10 ProseMirror"
        style={{ maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: news.content }}
      />

      {/* 좋아요 수 및 버튼 */}
      <div className="flex items-center gap-4 mb-0 pb-6 border-b">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
        <span className="text-gray-700 font-medium">{likesCount}</span>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
            isLiked
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="font-medium text-sm">좋아요</span>
        </button>
      </div>
      </div>
    </div>
  )
}
