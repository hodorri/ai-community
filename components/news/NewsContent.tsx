'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import PinnedNewsItem from './PinnedNewsItem'
import NewsListRowItem from './NewsListRowItem'
import NewsEditor from './NewsEditor'
import type { News } from '@/lib/types/database'

export default function NewsContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchNews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      // 모든 뉴스 조회 (크롤링된 글 + 개별 작성 글 모두 포함)
      const { data: allNewsData, error: newsError } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100)

      if (newsError) {
        console.error('뉴스 조회 오류:', newsError)
        throw new Error(newsError.message || '뉴스를 불러오는데 실패했습니다.')
      }

      if (!allNewsData || allNewsData.length === 0) {
        setNews([])
        setLoading(false)
        return
      }

      // 각 뉴스의 프로필 정보, 좋아요 수, 댓글 수 조회
      const newsWithCounts = await Promise.all(
        allNewsData.map(async (item) => {
          // 좋아요 수 조회
          const [likesResult] = await Promise.all([
            supabase
              .from('news_likes')
              .select('*', { count: 'exact', head: true })
              .eq('news_id', item.id),
          ])

          // 댓글 수 조회
          const [commentsResult] = await Promise.all([
            supabase
              .from('news_comments')
              .select('*', { count: 'exact', head: true })
              .eq('news_id', item.id),
          ])

          // 수동 게시인 경우 프로필 정보 조회
          if (item.is_manual && item.user_id) {
            const [profileResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('email, name, nickname, avatar_url, company, team, position')
                .eq('id', item.user_id)
                .maybeSingle(),
            ])

            return {
              ...item,
              user: profileResult.data || null,
              likes_count: likesResult.count || 0,
              comments_count: commentsResult.count || 0,
            } as News
          }

          return {
            ...item,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          } as News
        })
      )

      setNews(newsWithCounts)
    } catch (err) {
      console.error('뉴스 조회 예외:', err)
      setError(err instanceof Error ? err.message : '뉴스를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    fetchNews()
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-700 font-semibold mb-2">오류가 발생했습니다</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  // 고정 게시물과 일반 게시물 분리
  // 고정 게시물: is_pinned가 true인 것만 (최대 3개)
  const pinnedNews = news.filter(item => item.is_pinned === true).slice(0, 3)
  // 일반 게시물: is_pinned가 false이거나 null/undefined인 모든 게시물 (크롤링된 글 + 개별 작성 글 모두 포함)
  const regularNews = news.filter(item => item.is_pinned !== true)

  return (
    <div>
      {/* 뉴스 목록 */}
      {news.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gradient-ok-subtle rounded-2xl p-12">
            <p className="text-gray-600 mb-2 text-lg">아직 뉴스가 없습니다.</p>
            <p className="text-sm text-gray-400">새로운 뉴스를 작성해보세요.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 고정 게시물 3개 병렬 표시 */}
          {pinnedNews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pinnedNews.map((item) => (
                <PinnedNewsItem key={item.id} news={item} />
              ))}
            </div>
          )}

          {/* 일반 게시물 목록 (PostListItem 스타일) */}
          {regularNews.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {regularNews.map((item) => (
                <NewsListRowItem key={item.id} news={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 뉴스 작성 폼 모달 */}
      {showCreateForm && (
        <NewsEditor
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
