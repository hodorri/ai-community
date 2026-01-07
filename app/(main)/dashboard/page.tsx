'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PostCard from '@/components/post/PostCard'
import PostListItem from '@/components/post/PostListItem'
import CopList from '@/components/cop/CopList'
import CopCreateForm from '@/components/cop/CopCreateForm'
import MyCopRequests from '@/components/cop/MyCopRequests'
import NewsContent from '@/components/news/NewsContent'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

type TabType = 'all' | 'diary' | 'news' | 'cases' | 'study'

function DashboardContent() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['all', 'diary', 'news', 'cases', 'study'].includes(tabParam)) {
      setActiveTab(tabParam as TabType)
    } else if (user) {
      setActiveTab('all')
    } else {
      setActiveTab('diary')
    }
  }, [user, searchParams])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    // URL 업데이트하여 Sidebar가 활성화 상태를 감지할 수 있도록 함
    if (tab === 'all') {
      router.push('/dashboard')
    } else {
      router.push(`/dashboard?tab=${tab}`)
    }
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
          <Link
            href="/login"
            className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-ok-dark transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 탭 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'all' && user && (
          <div className="space-y-12">
            {/* 최신 AI 소식 - 고정 게시물만 표시 + 전체보기 버튼 */}
            <NewsContent showAll={false} />
            
            {/* AI 활용사례 - 최대 3개 */}
            <CasesSummary />
            
            {/* AI 개발일지 - 최대 3개 */}
            <DiarySummary />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">AI CoP</h2>
                <Link
                  href="/dashboard?tab=study"
                  className="text-ok-primary hover:text-ok-dark font-semibold text-sm flex items-center gap-1"
                >
                  CoP 전체보기 →
                </Link>
              </div>
              <StudyContent showCreateButton={false} showTitle={false} limit={3} />
            </div>
          </div>
        )}

        {activeTab === 'diary' && <DiaryContent />}
        {activeTab === 'news' && <NewsContent />}
        {activeTab === 'study' && <StudyContent showCreateButton={true} showTitle={true} showDescription={true} />}
      </div>
    </div>
  )
}

// 개발 일지 컴포넌트
function DiaryContent() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        // 클라이언트에서 직접 Supabase 사용
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        console.log('[클라이언트] 게시글 조회 시작')
        
        // 게시글 조회 (고정 게시글 먼저, 그 다음 최신순)
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (postsError) {
          console.error('[클라이언트] 게시글 조회 오류:', postsError)
          throw new Error(postsError.message || '게시글을 불러오는데 실패했습니다.')
        }
        
        console.log('[클라이언트] 조회된 게시글 수:', postsData?.length || 0)
        
        if (!postsData || postsData.length === 0) {
          setPosts([])
          setError(null)
          setLoading(false)
          return
        }
        
        // 각 게시글의 프로필 정보, 좋아요 수, 댓글 수 조회
        const postsWithCounts = await Promise.all(
          postsData.map(async (post: any) => {
            const [profileResult, likesResult, commentsResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('email, name, nickname, avatar_url, company, team, position')
                .eq('id', post.user_id)
                .single(),
              supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id),
              supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id),
            ])

            return {
              ...post,
              user: {
                email: profileResult.data?.email || null,
                name: profileResult.data?.name || null,
                nickname: profileResult.data?.nickname || null,
                avatar_url: profileResult.data?.avatar_url || null,
                company: profileResult.data?.company || null,
                team: profileResult.data?.team || null,
                position: profileResult.data?.position || null,
              },
              likes_count: likesResult.count || 0,
              comments_count: commentsResult.count || 0,
            }
          })
        )
        
        console.log('[클라이언트] 게시글 조회 완료 - 총', postsWithCounts.length, '개')
        setPosts(postsWithCounts)
        setError(null)
      } catch (error) {
        console.error('[클라이언트] 예외 발생:', error)
        setError(error instanceof Error ? error.message : '게시글을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
    
    // 게시글 작성 이벤트 리스너
    const handlePostCreated = () => {
      console.log('[클라이언트] 게시글 작성 이벤트 수신, 목록 새로고침')
      fetchPosts()
    }
    
    window.addEventListener('post-created', handlePostCreated)
    
    return () => {
      window.removeEventListener('post-created', handlePostCreated)
    }
  }, [])

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

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">아직 작성된 게시글이 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      {/* 페이지 제목 및 설명 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">AI 개발일지</h1>
        <p className="text-gray-600 text-base">
          엔지니어들의 실시간 개발 기록 공간입니다. 진행 과정을 공유하고 댓글 피드백을 통해 기술적 깊이를 더해보세요.
        </p>
      </div>

      {/* 글쓰기 버튼 */}
      {user && (
        <div className="mb-6 flex justify-end">
          <Link
            href="/post/new"
            className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
          >
            글쓰기
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {posts.map((post: any) => (
          <PostListItem key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

// 최신 AI News 컴포넌트는 별도 파일로 분리됨

// AI 활용사례 요약 컴포넌트 (대시보드용, 최대 3개)
function CasesSummary() {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCases() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('ai_cases')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3)
        
        if (error) throw error
        
        const casesWithUser = (data || []).map((c: any) => ({
          ...c,
          user: {
            email: c.author_email || null,
            name: c.author_name || null,
            nickname: c.author_name || null,
            avatar_url: null,
            company: null,
            team: null,
            position: null,
          },
          likes_count: 0,
          comments_count: 0,
          user_id: c.imported_by || null,
        }))
        
        setCases(casesWithUser)
      } catch (error) {
        console.error('AI 활용사례 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCases()
  }, [])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI 활용사례</h2>
        <Link
          href="/cases"
          className="text-ok-primary hover:text-ok-dark font-semibold text-sm flex items-center gap-1"
        >
          사례 전체보기 →
        </Link>
      </div>
      
      {cases.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 등록된 활용사례가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {cases.map((c: any) => (
            <PostListItem key={c.id} post={c} linkPrefix="/cases" />
          ))}
        </div>
      )}
    </div>
  )
}

// AI 개발일지 요약 컴포넌트 (대시보드용, 최대 3개)
function DiarySummary() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3)
        
        if (postsError) throw postsError
        
        if (!postsData || postsData.length === 0) {
          setPosts([])
          setLoading(false)
          return
        }
        
        const postsWithCounts = await Promise.all(
          postsData.map(async (post: any) => {
            const [profileResult, likesResult, commentsResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('email, name, nickname, avatar_url, company, team, position')
                .eq('id', post.user_id)
                .single(),
              supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id),
              supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id),
            ])

            return {
              ...post,
              user: {
                email: profileResult.data?.email || null,
                name: profileResult.data?.name || null,
                nickname: profileResult.data?.nickname || null,
                avatar_url: profileResult.data?.avatar_url || null,
                company: profileResult.data?.company || null,
                team: profileResult.data?.team || null,
                position: profileResult.data?.position || null,
              },
              likes_count: likesResult.count || 0,
              comments_count: commentsResult.count || 0,
            }
          })
        )
        
        setPosts(postsWithCounts)
      } catch (error) {
        console.error('AI 개발일지 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI 개발일지</h2>
        <Link
          href="/dashboard?tab=diary"
          className="text-ok-primary hover:text-ok-dark font-semibold text-sm flex items-center gap-1"
        >
          개발일지 전체보기 →
        </Link>
      </div>
      
      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 작성된 개발일지가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {posts.map((post: any) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

// AI CoP 컴포넌트
function StudyContent({ showCreateButton = true, showTitle = true, showDescription = false, limit }: { showCreateButton?: boolean, showTitle?: boolean, showDescription?: boolean, limit?: number }) {
  const { user } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMyRequests, setShowMyRequests] = useState(false)

  return (
    <div>
      {/* 페이지 제목 및 설명 */}
      {showDescription && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">AI CoP</h1>
          <p className="text-gray-600 text-base">
            툴과 주제별 학습 모임(CoP) 공간입니다. 직접 개설하거나 참여하며 주도적으로 AI 역량을 강화해 보세요.
          </p>
        </div>
      )}

      {/* 헤더 및 개설하기 버튼 */}
      {(showTitle || showCreateButton) && (
        <div className="flex items-center justify-end mb-6">
          {showCreateButton && user && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowMyRequests(true)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                개설 내역 조회하기
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
              >
                개설하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* CoP 목록 */}
      <CopList limit={limit} />

      {/* CoP 개설 폼 모달 */}
      {showCreateForm && (
        <CopCreateForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            // 목록 새로고침은 CopList에서 처리
            window.location.reload()
          }}
        />
      )}

      {/* 내 CoP 개설 내역 모달 */}
      {showMyRequests && (
        <MyCopRequests
          onClose={() => setShowMyRequests(false)}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩 중...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
