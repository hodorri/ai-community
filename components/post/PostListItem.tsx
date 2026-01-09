import Link from 'next/link'
import Image from 'next/image'
import type { Post } from '@/lib/types/database'

interface PostListItemProps {
  post: Post & { 
    user?: { 
      email: string
      name?: string
      nickname?: string
      avatar_url?: string
      company?: string
      team?: string
      position?: string
    }
  }
  linkPrefix?: string // 링크 접두사 (기본값: '/post')
  noLink?: boolean // 링크 비활성화 (기본값: false)
}

// HTML 태그 제거 및 텍스트 추출 함수
function stripHtmlTags(html: string): string {
  if (typeof window === 'undefined') {
    // 서버 사이드: 간단한 정규식으로 처리
    return html
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ') // &nbsp;를 공백으로
      .replace(/&amp;/g, '&') // &amp;를 &로
      .replace(/&lt;/g, '<') // &lt;를 <로
      .replace(/&gt;/g, '>') // &gt;를 >로
      .replace(/&quot;/g, '"') // &quot;를 "로
      .replace(/&#39;/g, "'") // &#39;를 '로
      .trim()
  } else {
    // 클라이언트 사이드: DOMParser 사용
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }
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

export default function PostListItem({ post, linkPrefix = '/post', noLink = false }: PostListItemProps) {
  const previewImage = post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : null
  const authorAvatar = post.user?.avatar_url
  const authorName = post.user?.nickname || post.user?.name || post.user?.email?.split('@')[0] || '익명'
  const authorInitial = authorName.charAt(0).toUpperCase()
  
  // 내용 미리보기 (HTML 태그 제거 후 텍스트만 추출)
  const contentText = post.content ? stripHtmlTags(post.content) : ''
  const contentPreview = contentText
    ? contentText.length > 100
      ? contentText.substring(0, 100) + '...'
      : contentText
    : ''

  // post.id가 없으면 링크를 비활성화
  if (!post.id) {
    console.error('PostListItem: post.id가 없습니다.', post)
    return null
  }

  // AI 활용사례(/cases)에서는 아바타 이미지 표시하지 않음
  const showAvatar = linkPrefix !== '/cases'

  const articleContent = (
    <article className={`flex items-start gap-4 py-4 px-4 border-b border-gray-200 ${noLink ? '' : 'hover:bg-gray-50 transition-colors cursor-pointer'}`}>
        {/* 썸네일 - 게시글 이미지가 있으면 게시글 이미지, 없으면 작성자 프로필 사진 (AI 활용사례 제외) */}
        {showAvatar && (
          <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
            {previewImage ? (
              <Image
                src={previewImage}
                alt={post.title}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : authorAvatar ? (
              <div className="relative w-full h-full">
                <Image
                  src={authorAvatar}
                  alt={authorName}
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
        )}

        {/* 내용 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.is_pinned && (
              <span className="text-yellow-500" title="고정된 게시글">📌</span>
            )}
            <h2 className="text-lg font-bold text-gray-900 line-clamp-1 hover:text-ok-primary transition-colors">
              {post.title}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {contentPreview || '내용이 없습니다.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {/* AI 활용사례일 때는 "작성자명 · AI Engineer [기수] · 시간" 형태로 표시 */}
            {linkPrefix === '/cases' ? (
              <>
                {authorName && (
                  <>
                    <span>{authorName}</span>
                    <span>·</span>
                  </>
                )}
                <span>
                  AI Engineer{post.ai_engineer_cohort ? ` ${post.ai_engineer_cohort}` : ''}
                </span>
                <span>·</span>
                <span>{getTimeAgo(post.published_at || post.created_at)}</span>
              </>
            ) : (
              <>
                <span>{authorName}</span>
                {post.user && (post.user.company || post.user.team || post.user.name || post.user.position) && (
                  <>
                    <span>·</span>
                    <span>{[post.user.company, post.user.team, post.user.name, post.user.position].filter(Boolean).join(' ')}</span>
                  </>
                )}
                <span>·</span>
                <span>{getTimeAgo(post.created_at)}</span>
              </>
            )}
          </div>
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
            <span>{post.likes_count || 0}</span>
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
            <span>{post.comments_count || 0}</span>
          </div>
        </div>
      </article>
  )

  // 링크가 비활성화된 경우 article만 반환
  if (noLink) {
    return articleContent
  }

  // 링크 활성화된 경우 Link로 감싸서 반환
  return (
    <Link 
      href={`${linkPrefix}/${post.id}`}
      className="block"
    >
      {articleContent}
    </Link>
  )
}
