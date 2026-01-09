'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import PinnedNewsItem from './PinnedNewsItem'
import NewsListRowItem from './NewsListRowItem'
import NewsEditor from './NewsEditor'
import type { News } from '@/lib/types/database'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

interface NewsContentProps {
  showAll?: boolean // true면 모든 뉴스 표시, false면 고정 게시물만 표시 (기본값: true)
}

export default function NewsContent({ showAll = true }: NewsContentProps = {}) {
  const { user } = useAuth()
  const supabase = createClient()
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    fetchNews()
    
    // 뉴스 업데이트 이벤트 리스너 등록
    const handleNewsUpdate = () => {
      fetchNews()
    }
    
    window.addEventListener('news-updated', handleNewsUpdate)
    
    return () => {
      window.removeEventListener('news-updated', handleNewsUpdate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      // news 테이블과 selected_news 테이블에서 모두 조회
      const [newsResult, selectedNewsResult] = await Promise.all([
        supabase
          .from('news')
          .select('*')
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('selected_news')
          .select('*')
          .order('selected_at', { ascending: false })
          .limit(100),
      ])

      if (newsResult.error) {
        console.error('뉴스 조회 오류:', newsResult.error)
        throw new Error(newsResult.error.message || '뉴스를 불러오는데 실패했습니다.')
      }

      if (selectedNewsResult.error) {
        console.error('선택된 뉴스 조회 오류:', selectedNewsResult.error)
        throw new Error(selectedNewsResult.error.message || '선택된 뉴스를 불러오는데 실패했습니다.')
      }

      // 두 테이블의 데이터를 합치고 News 타입으로 변환
      const newsData = (newsResult.data || []).map(item => ({
        ...item,
        source_url: item.source_url || null,
        source_site: item.source_site || null,
        author_name: item.author_name || null,
        image_url: item.image_url || null,
        published_at: item.published_at || item.created_at,
        is_manual: item.is_manual ?? false,
        is_pinned: item.is_pinned ?? false,
      }))

      const selectedNewsData = (selectedNewsResult.data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content || '',
        source_url: item.source_url || null,
        source_site: item.source_site || null,
        author_name: item.author_name || null,
        user_id: null,
        image_url: item.image_url || null,
        published_at: item.published_at || item.selected_at,
        is_manual: false,
        created_at: item.created_at,
        updated_at: item.updated_at,
        is_pinned: item.is_pinned ?? false, // selected_news 테이블의 is_pinned 값 사용
      }))

      // 두 데이터를 합치고 날짜순으로 정렬
      const allNewsData = [...newsData, ...selectedNewsData].sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime()
        const dateB = new Date(b.published_at || b.created_at).getTime()
        return dateB - dateA
      })

      if (allNewsData.length === 0) {
        setNews([])
        setLoading(false)
        return
      }

      // 각 뉴스의 프로필 정보, 좋아요 수, 댓글 수 조회
      const newsWithCounts = await Promise.all(
        allNewsData.map(async (item) => {
          // news 테이블에서 온 항목만 좋아요/댓글 수 조회 (selected_news는 news_id가 없음)
          const isFromNewsTable = newsData.some(n => n.id === item.id)
          
          let likesCount = 0
          let commentsCount = 0

          if (isFromNewsTable) {
            // 좋아요 수 조회
            const likesResult = await supabase
              .from('news_likes')
              .select('*', { count: 'exact', head: true })
              .eq('news_id', item.id)

            // 댓글 수 조회
            const commentsResult = await supabase
              .from('news_comments')
              .select('*', { count: 'exact', head: true })
              .eq('news_id', item.id)

            likesCount = likesResult.count || 0
            commentsCount = commentsResult.count || 0
          }

          // 수동 게시인 경우 프로필 정보 조회
          if (item.is_manual && item.user_id) {
            const profileResult = await supabase
              .from('profiles')
              .select('email, name, nickname, avatar_url, company, team, position')
              .eq('id', item.user_id)
              .maybeSingle()

            return {
              ...item,
              user: profileResult.data || null,
              likes_count: likesCount,
              comments_count: commentsCount,
            } as News
          }

          return {
            ...item,
            likes_count: likesCount,
            comments_count: commentsCount,
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
          {/* 페이지 제목 및 설명 */}
          {showAll && (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">최신 AI 소식</h1>
              <p className="text-gray-600 text-base">
                AI 뉴스 큐레이션 공간입니다. 최신 기사를 읽고 자유롭게 의견을 나누며 인사이트를 공유하세요.
              </p>
            </div>
          )}
          
          {/* 대시보드용 제목 (showAll이 false일 때) */}
          {!showAll && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">최신 AI 소식</h2>
              {pinnedNews.length > 0 && (
                <Link
                  href="/dashboard?tab=news"
                  className="text-ok-primary hover:text-ok-dark font-semibold text-sm flex items-center gap-1"
                >
                  뉴스 전체보기 →
                </Link>
              )}
            </div>
          )}

          {/* 글쓰기 버튼 */}
          {showAll && isAdmin && (
            <div className="mb-6 flex justify-end">
              <Link
                href="/news/new"
                className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
              >
                글쓰기
              </Link>
            </div>
          )}

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


              {/* 전체보기 모드일 때만 일반 게시물 목록 표시 */}
              {showAll && regularNews.length > 0 && (
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
