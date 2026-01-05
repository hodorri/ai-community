'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { News } from '@/lib/types/database'

interface NewsListItemProps {
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

export default function NewsListItem({ news }: NewsListItemProps) {
  const contentPreview = stripHtmlTags(news.content).substring(0, 80)
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

  return (
    <Link 
      href={`/news/${news.id}`}
      className="block group"
    >
      <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        {/* 썸네일 이미지 */}
        <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
          {news.image_url ? (
            <Image
              src={news.image_url}
              alt={news.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">{authorInitial}</span>
            </div>
          )}
        </div>

        {/* 내용 영역 */}
        <div className="p-4 flex-1 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-ok-primary transition-colors">
            {news.title}
          </h2>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
            {contentPreview || '내용이 없습니다.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto">
            <span>{sourceInfo}</span>
            {news.is_manual && news.user && (news.user.company || news.user.team || news.user.name || news.user.position) && (
              <>
                <span>·</span>
                <span>{[news.user.company, news.user.team, news.user.name, news.user.position].filter(Boolean).join(' ')}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
