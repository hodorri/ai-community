'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NewsDetail from './NewsDetail'
import NewsCommentSection from './NewsCommentSection'
import type { News } from '@/lib/types/database'

interface NewsPageClientProps {
  newsId: string
  initialNews: News
  isFromSelectedNews?: boolean
}

export default function NewsPageClient({ newsId, initialNews, isFromSelectedNews = false }: NewsPageClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [news, setNews] = useState<News | null>(initialNews)
  const [loading, setLoading] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [fromSelectedNews, setFromSelectedNews] = useState(isFromSelectedNews)

  // 초기 뉴스 데이터에 프로필 정보가 있으면 그대로 사용
  useEffect(() => {
    if (initialNews && initialNews.user) {
      setNews(initialNews)
    }
  }, [initialNews])

  useEffect(() => {
    // 클라이언트에서 최신 데이터로 업데이트
    async function fetchNews() {
      try {
        setLoading(true)
        
        // 현재 사용자 확인
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id)

        // 먼저 news 테이블에서 조회
        let { data: newsData, error: newsError } = await supabase
          .from('news')
          .select('*')
          .eq('id', newsId)
          .maybeSingle()

        let isFromSelected = false

        // news 테이블에 없으면 selected_news 테이블에서 조회
        if (!newsData || newsError) {
          const { data: selectedNewsData, error: selectedError } = await supabase
            .from('selected_news')
            .select('*')
            .eq('id', newsId)
            .maybeSingle()

          if (selectedError || !selectedNewsData) {
            router.push('/dashboard?tab=news')
            return
          }

          // selected_news를 News 타입으로 변환
          newsData = {
            id: selectedNewsData.id,
            title: selectedNewsData.title,
            content: selectedNewsData.content || '',
            source_url: selectedNewsData.source_url || null,
            source_site: selectedNewsData.source_site || null,
            author_name: selectedNewsData.author_name || null,
            user_id: null,
            image_url: selectedNewsData.image_url || null,
            published_at: selectedNewsData.published_at || selectedNewsData.selected_at,
            is_manual: false,
            created_at: selectedNewsData.created_at,
            updated_at: selectedNewsData.updated_at,
            is_pinned: false,
          } as any
          isFromSelected = true
          setFromSelectedNews(true)
        }

        // 좋아요 수 조회
        let likesCount = 0
        try {
          const { count } = await supabase
            .from('news_likes')
            .select('*', { count: 'exact', head: true })
            .eq('news_id', newsId)
          likesCount = count || 0
        } catch (error) {
          console.warn('좋아요 수 조회 실패:', error)
        }

        // 댓글 수 조회
        let commentsCount = 0
        try {
          const { count } = await supabase
            .from('news_comments')
            .select('*', { count: 'exact', head: true })
            .eq('news_id', newsId)
          commentsCount = count || 0
        } catch (error) {
          console.warn('댓글 수 조회 실패:', error)
        }

        // 현재 사용자의 좋아요 상태 확인
        let liked = false
        if (user) {
          try {
            const { data: like } = await supabase
              .from('news_likes')
              .select('id')
              .eq('news_id', newsId)
              .eq('user_id', user.id)
              .maybeSingle()
            
            liked = !!like
          } catch (error) {
            console.warn('좋아요 상태 조회 실패:', error)
          }
        }

        // 수동 게시인 경우 프로필 정보 조회
        if (!isFromSelected && newsData.is_manual && newsData.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, name, nickname, avatar_url, company, team, position')
            .eq('id', newsData.user_id)
            .maybeSingle()

          setNews({
            ...newsData,
            user: profileData || null,
            likes_count: likesCount,
            comments_count: commentsCount,
          } as News)
        } else {
          setNews({
            ...newsData,
            likes_count: likesCount,
            comments_count: commentsCount,
          } as News)
        }

        setIsLiked(liked)
      } catch (error) {
        console.error('뉴스 조회 예외:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [newsId, router, supabase])

  if (loading && !news) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-600 font-semibold">뉴스를 찾을 수 없습니다.</div>
        <button
          onClick={() => router.push('/dashboard?tab=news')}
          className="px-4 py-2 bg-ok-primary text-white rounded-lg hover:bg-ok-dark transition-colors"
        >
          뉴스 목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <NewsDetail 
            news={news} 
            isLiked={isLiked}
            currentUserId={currentUserId}
            isFromSelectedNews={fromSelectedNews}
          />
          <div className="px-6 sm:px-8 pb-6 border-t">
            <NewsCommentSection newsId={newsId} />
          </div>
        </div>
      </div>
    </div>
  )
}
