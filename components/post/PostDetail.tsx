'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import UserBadges from '@/components/UserBadges'
import type { Post } from '@/lib/types/database'

interface PostDetailProps {
  post: Post & { user?: { email: string } }
  isLiked: boolean
  currentUserId?: string
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function PostDetail({ post, isLiked: initialIsLiked, currentUserId }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [authorProfile, setAuthorProfile] = useState<{ name?: string, nickname?: string, avatar_url?: string, company?: string, team?: string, position?: string } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isPinned, setIsPinned] = useState(post.is_pinned || false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const isOwner = currentUserId === post.user_id
  const isAdmin = currentUserEmail === ADMIN_EMAIL

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

  useEffect(() => {
    async function fetchAuthorProfile() {
      if (!post.user_id) return
      
      const { data } = await supabase
        .from('profiles')
        .select('name, nickname, avatar_url, company, team, position')
        .eq('id', post.user_id)
        .single()
      
      if (data) {
        setAuthorProfile(data)
      }
    }
    
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserEmail(user?.email || null)
    }
    
    fetchAuthorProfile()
    fetchCurrentUser()
  }, [post.user_id, supabase])

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }

    try {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .single()

      if (existingLike) {
        // 좋아요 취소
        await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id)
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          })
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      // 관련 포인트 먼저 삭제
      await supabase
        .from('activity_points')
        .delete()
        .eq('reference_id', post.id)
        .eq('activity_type', 'post_create')

      // 게시글 삭제 (RLS 정책에서 관리자 허용)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleTogglePin = async () => {
    if (!isAdmin) return

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !isPinned })
        .eq('id', post.id)

      if (error) {
        throw error
      }

      setIsPinned(!isPinned)
      router.refresh()
    } catch (error) {
      console.error('고정 상태 변경 오류:', error)
      alert('고정 상태 변경에 실패했습니다.')
    }
  }

  const displayName = authorProfile?.nickname || authorProfile?.name || post.user?.email?.split('@')[0] || '익명'
  const avatarUrl = authorProfile?.avatar_url
  const timeAgo = getTimeAgo(new Date(post.created_at))

  return (
    <div className="p-6 sm:p-8">
      {/* 헤더 - 목록으로 돌아가기, 카테고리, 고정 버튼 및 메뉴 */}
      <div className="relative flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/dashboard?tab=diary')}
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
          <span className="text-sm text-gray-600">💡 AI 개발일지</span>
        </div>
        {(isAdmin || isOwner) ? (
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
                {isAdmin && (
                  <button
                    onClick={handleTogglePin}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                  >
                    {isPinned ? '고정 해제' : '상단 고정'}
                  </button>
                )}
                {(isOwner || isAdmin) && (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        router.push(`/post/${post.id}/edit`)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      수정하기
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        handleDelete()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                    >
                      삭제하기
                    </button>
                  </>
                )}
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
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="font-semibold text-gray-900 inline-flex items-center">
            {displayName}
            {post.user_id && <UserBadges userId={post.user_id} size={20} />}
          </div>
          {authorProfile && (authorProfile.company || authorProfile.team || authorProfile.name || authorProfile.position) && (
            <div className="text-xs text-gray-500 mt-0.5">
              {[authorProfile.company, authorProfile.team, authorProfile.name, authorProfile.position].filter(Boolean).join(' ')}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {timeAgo} · AI 개발일지에 게시됨
          </div>
        </div>
      </div>

      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-8 text-gray-900 leading-tight">{post.title}</h1>

      {/* 본문 내용 */}
      <div 
        className="prose prose-lg max-w-none mb-10 ProseMirror"
        style={{ maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: post.content }}
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
