'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { News } from '@/lib/types/database'

interface FeaturedNewsItemProps {
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

export default function FeaturedNewsItem({ news }: FeaturedNewsItemProps) {
  const contentPreview = stripHtmlTags(news.content).substring(0, 200)
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

  return (
    <Link 
      href={`/news/${news.id}`}
      className="block group"
    >
      <article className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row">
          {/* 큰 이미지 */}
          <div className="md:w-1/2 h-64 md:h-auto bg-gray-200 relative overflow-hidden">
            {news.image_url ? (
              news.image_url.startsWith('http') && !news.image_url.includes('supabase.co') ? (
                <img
                  src={news.image_url}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <Image
                  src={news.image_url}
                  alt={news.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* 텍스트 영역 */}
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-ok-primary transition-colors">
                {news.title}
              </h2>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {contentPreview || '내용이 없습니다.'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
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
        </div>
      </article>
    </Link>
  )
}
