'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { News } from '@/lib/types/database'

interface NewsListRowItemProps {
  news: News
}

function stripHtmlTags(html: string): string {
  if (typeof window !== 'undefined') {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
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

export default function NewsListRowItem({ news }: NewsListRowItemProps) {
  const contentText = news.content ? stripHtmlTags(news.content) : ''
  const contentPreview = contentText
    ? contentText.length > 100
      ? contentText.substring(0, 100) + '...'
      : contentText
    : ''

  const timeAgo = news.published_at 
    ? getTimeAgo(news.published_at)
    : getTimeAgo(news.created_at)

  // 작성자 정보
  const displayName = news.is_manual && news.user
    ? (news.user.nickname || news.user.name || '익명')
    : (news.author_name || '알 수 없음')
  
  // 수동 게시인 경우 작성자 정보 표시, 크롤링된 경우 출처 사이트 표시
  const sourceInfo = news.is_manual && news.user
    ? displayName
    : (news.source_site || '뉴닉')

  const authorInitial = displayName.charAt(0).toUpperCase()
  const authorAvatar = news.user?.avatar_url

  return (
    <Link 
      href={`/news/${news.id}`}
      className="block"
    >
      <article className="flex items-start gap-4 py-4 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
        {/* 썸네일 - 뉴스 이미지가 있으면 뉴스 이미지, 없으면 작성자 프로필 사진 */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
          {news.image_url ? (
            <Image
              src={news.image_url}
              alt={news.title}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : authorAvatar ? (
            <div className="relative w-full h-full">
              <Image
                src={authorAvatar}
                alt={displayName}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-ok-primary flex items-center justify-center">
              <span className="text-white font-semibold text-xl">{authorInitial}</span>
            </div>
          )}
        </div>

        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {news.is_pinned && (
              <span className="text-yellow-500" title="고정된 게시물">📌</span>
            )}
            <h2 className="text-lg font-bold text-gray-900 line-clamp-1 hover:text-ok-primary transition-colors">
              {news.title}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {contentPreview || '내용이 없습니다.'}
          </p>
        </div>

        {/* 좋아요/댓글 수 */}
        <div className="flex-shrink-0 flex items-center gap-4 text-sm text-gray-500 ml-4">
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
            <span>{news.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-gray-500"
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
            <span>{news.comments_count || 0}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
