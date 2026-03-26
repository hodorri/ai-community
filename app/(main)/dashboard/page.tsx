'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PostCard from '@/components/post/PostCard'
import PostListItem from '@/components/post/PostListItem'
import CopList from '@/components/cop/CopList'
import CopCreateForm from '@/components/cop/CopCreateForm'
import MyCopRequests from '@/components/cop/MyCopRequests'
import NewsContent from '@/components/news/NewsContent'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

type TabType = 'all' | 'notice' | 'diary' | 'news' | 'cases' | 'study' | 'cop-log' | 'engineer' | 'activity'

function DashboardContent() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['all', 'notice', 'diary', 'news', 'cases', 'study', 'cop-log', 'engineer', 'activity'].includes(tabParam)) {
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

        {activeTab === 'notice' && <NoticeContent />}
        {activeTab === 'diary' && <DiaryContent />}
        {activeTab === 'news' && <NewsContent />}
        {activeTab === 'study' && <StudyContent showCreateButton={true} showTitle={true} showDescription={true} />}
        {activeTab === 'cop-log' && <CopLogContent />}
        {activeTab === 'engineer' && <EngineerContent />}
        {activeTab === 'activity' && <ActivityContent />}
      </div>
    </div>
  )
}

// 공지사항 컴포넌트
function NoticeContent() {
  const { user } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    async function fetchNotices() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: noticesData, error: noticesError } = await supabase
          .from('notices')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20)

        if (noticesError) {
          throw new Error(noticesError.message || '공지사항을 불러오는데 실패했습니다.')
        }

        if (!noticesData || noticesData.length === 0) {
          setNotices([])
          setLoading(false)
          return
        }

        const noticesWithCounts = await Promise.all(
          noticesData.map(async (notice: any) => {
            const [profileResult, likesResult, commentsResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('email, name, nickname, avatar_url, company, team, position')
                .eq('id', notice.user_id)
                .single(),
              supabase
                .from('notice_likes')
                .select('*', { count: 'exact', head: true })
                .eq('notice_id', notice.id),
              supabase
                .from('notice_comments')
                .select('*', { count: 'exact', head: true })
                .eq('notice_id', notice.id),
            ])

            return {
              ...notice,
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

        setNotices(noticesWithCounts)
        setError(null)
      } catch (error) {
        setError(error instanceof Error ? error.message : '공지사항을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchNotices()
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
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">공지사항</h1>
        <p className="text-gray-600 text-base">
          커뮤니티 운영 관련 공지사항을 확인하세요.
        </p>
      </div>

      {/* 관리자만 글쓰기 버튼 표시 */}
      {isAdmin && (
        <div className="mb-6 flex justify-end">
          <Link
            href="/notice/new"
            className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
          >
            공지 작성
          </Link>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500">아직 등록된 공지사항이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {notices.map((notice: any) => (
            <PostListItem key={notice.id} post={notice} linkPrefix="/notice" />
          ))}
        </div>
      )}
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
      <div className="mb-6 flex justify-end">
        <Link
          href="/post/new"
          className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
        >
          글쓰기
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500">아직 작성된 게시글이 없습니다.</p>
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

// AI Engineer 컴포넌트
function EngineerContent() {
  const { user } = useAuth()
  const [engineers, setEngineers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCohort, setSelectedCohort] = useState<string>('all')
  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    async function fetchEngineers() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data, error } = await supabase
          .from('ai_engineers')
          .select('*')
          .order('cohort', { ascending: true })
          .order('name', { ascending: true })

        if (error) throw error
        setEngineers(data || [])
      } catch (error) {
        console.error('AI Engineer 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEngineers()
  }, [])

  const cohorts = [...new Set(engineers.map(e => e.cohort))].sort()
  const filtered = selectedCohort === 'all' ? engineers : engineers.filter(e => e.cohort === selectedCohort)

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">AI Engineer</h1>
        <p className="text-gray-600 text-base">
          OK금융그룹 AI Engineer 양성 프로그램 수료생 명단입니다.
        </p>
      </div>

      {/* 기수 필터 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setSelectedCohort('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            selectedCohort === 'all'
              ? 'bg-ok-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체 ({engineers.length})
        </button>
        {cohorts.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCohort(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedCohort === c
                ? 'bg-ok-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {c} ({engineers.filter(e => e.cohort === c).length})
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filtered.map((eng: any) => {
          const initial = eng.name?.charAt(0) || '?'
          const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
            'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
          ]
          const colorIdx = eng.name ? eng.name.charCodeAt(0) % colors.length : 0

          return (
            <div
              key={eng.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
            >
              {/* 사진 or 이니셜 */}
              {eng.photo_url ? (
                <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden mb-3">
                  <Image src={eng.photo_url} alt={eng.name} fill className="object-cover" sizes="64px" />
                </div>
              ) : (
                <div className={`w-16 h-16 mx-auto rounded-full ${colors[colorIdx]} flex items-center justify-center text-white font-bold text-xl mb-3`}>
                  {initial}
                </div>
              )}

              {/* 이름 */}
              <h3 className="font-bold text-gray-900 text-sm">{eng.name}</h3>

              {/* 기수 뱃지 */}
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-ok-primary/10 text-ok-primary">
                AI Engineer {eng.cohort}
              </span>

              {/* 회사 소속 */}
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                {eng.company && <div>{eng.company}</div>}
                {eng.department && <div>{eng.department}</div>}
                {eng.title && <div>{eng.title}{eng.position ? ` / ${eng.position}` : ''}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500">등록된 AI Engineer가 없습니다.</p>
        </div>
      )}
    </div>
  )
}

// CoP 활동일지 컴포넌트
function CopLogContent() {
  const { user } = useAuth()
  const [cops, setCops] = useState<any[]>([])
  const [selectedCopId, setSelectedCopId] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    async function fetchCops() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data, error } = await supabase
          .from('cops')
          .select('*')
          .eq('status', 'approved')
          .order('name', { ascending: true })

        if (error) throw error

        // 각 CoP의 활동일지 수 조회
        const copsWithLogCount = await Promise.all(
          (data || []).map(async (cop: any) => {
            const { count } = await supabase
              .from('cop_logs')
              .select('*', { count: 'exact', head: true })
              .eq('cop_id', cop.id)

            const { data: ownerData } = await supabase
              .from('profiles')
              .select('name, nickname')
              .eq('id', cop.user_id)
              .single()

            return { ...cop, log_count: count || 0, owner: ownerData }
          })
        )

        setCops(copsWithLogCount)
      } catch (error) {
        console.error('CoP 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCops()
  }, [])

  async function fetchLogs(copId: string) {
    setSelectedCopId(copId)
    setLogsLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data, error } = await supabase
        .from('cop_logs')
        .select('*')
        .eq('cop_id', copId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const logsWithProfile = await Promise.all(
        (data || []).map(async (log: any) => {
          const [profileResult, likesResult, commentsResult] = await Promise.all([
            supabase.from('profiles')
              .select('email, name, nickname, avatar_url, company, team, position')
              .eq('id', log.user_id)
              .single(),
            supabase.from('cop_log_likes')
              .select('*', { count: 'exact', head: true })
              .eq('cop_log_id', log.id),
            supabase.from('cop_log_comments')
              .select('*', { count: 'exact', head: true })
              .eq('cop_log_id', log.id),
          ])
          return {
            ...log,
            user: profileResult.data || {},
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          }
        })
      )

      setLogs(logsWithProfile)
    } catch (error) {
      console.error('활동일지 조회 오류:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  const selectedCop = cops.find(c => c.id === selectedCopId)

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">CoP 활동일지</h1>
        <p className="text-gray-600 text-base">
          각 CoP별 활동일지를 확인하고 작성할 수 있습니다.
        </p>
      </div>

      {!selectedCopId ? (
        /* CoP 폴더 목록 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cops.map((cop: any) => (
            <button
              key={cop.id}
              onClick={() => fetchLogs(cop.id)}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-2xl flex-shrink-0">
                  📁
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{cop.name}</h3>
                  <p className="text-xs text-gray-500">
                    개설자: {cop.owner?.nickname || cop.owner?.name || '알 수 없음'}
                  </p>
                </div>
              </div>
              {cop.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{cop.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>활동일지 {cop.log_count}건</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
          {cops.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <p className="text-gray-500">승인된 CoP가 없습니다.</p>
            </div>
          )}
        </div>
      ) : (
        /* 선택된 CoP의 활동일지 목록 */
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedCopId(null); setLogs([]) }}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCop?.name}</h2>
                <p className="text-sm text-gray-500">활동일지 {logs.length}건</p>
              </div>
            </div>
            {user && (
              <Link
                href={`/cop-log/new?copId=${selectedCopId}`}
                className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
              >
                활동일지 작성
              </Link>
            )}
          </div>

          {logsLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <p className="text-gray-500 mb-4">아직 활동일지가 없습니다.</p>
              {user && (
                <Link
                  href={`/cop-log/new?copId=${selectedCopId}`}
                  className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors"
                >
                  첫 활동일지 작성하기
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {logs.map((log: any) => (
                <PostListItem key={log.id} post={log} linkPrefix="/cop-log" />
              ))}
            </div>
          )}
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

// 나의 활동 컴포넌트
function ActivityContent() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [activities, setActivities] = useState<any[]>([])
  const [myCops, setMyCops] = useState<any[]>([])
  const [myPoints, setMyPoints] = useState<any[]>([])
  const [allMyPoints, setAllMyPoints] = useState<any[]>([])
  const [pointSettings, setPointSettings] = useState<any[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const userId = user.id

    async function fetchMyActivities() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        // 내가 작성한 게시글 조회
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (postsError) throw postsError

        // 내가 작성한 댓글 조회
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*, post_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (commentsError) throw commentsError

        // 내 CoP 가입 내역 조회
        const { data: copMemberships, error: copError } = await supabase
          .from('cop_members')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        // 내 포인트 전체 조회
        const { data: allPointsData } = await supabase
          .from('activity_points')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (allPointsData) {
          setAllMyPoints(allPointsData)
          setMyPoints(allPointsData.slice(0, 5))
          setTotalPoints(allPointsData.reduce((sum: number, p: any) => sum + p.points, 0))
        }

        // 포인트 설정 조회
        const { data: settingsData } = await supabase
          .from('point_settings')
          .select('*')
          .order('activity_type')
        if (settingsData) setPointSettings(settingsData)

        if (!copError && copMemberships) {
          const copsWithDetails = await Promise.all(
            copMemberships.map(async (membership: any) => {
              const { data: copData } = await supabase
                .from('cops')
                .select('id, name, description, image_url, status, max_members')
                .eq('id', membership.cop_id)
                .single()

              const { count: memberCount } = await supabase
                .from('cop_members')
                .select('*', { count: 'exact', head: true })
                .eq('cop_id', membership.cop_id)
                .eq('status', 'approved')

              return {
                ...membership,
                cop: copData,
                member_count: memberCount || 0,
              }
            })
          )
          setMyCops(copsWithDetails.filter(c => c.cop))
        }

        // 게시글 데이터 가공
        const postsWithMetadata = await Promise.all(
          (postsData || []).map(async (post: any) => {
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
              type: 'post',
              id: post.id,
              created_at: post.created_at,
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
              ...post,
            }
          })
        )

        // 댓글 데이터 가공
        const commentsWithMetadata = await Promise.all(
          (commentsData || []).map(async (comment: any) => {
            const { data: postData } = await supabase
              .from('posts')
              .select('id, title, user_id')
              .eq('id', comment.post_id)
              .single()

            const [profileResult, postProfileResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('email, name, nickname, avatar_url, company, team, position')
                .eq('id', comment.user_id)
                .single(),
              postData ? supabase
                .from('profiles')
                .select('email, name, nickname')
                .eq('id', postData.user_id)
                .single() : Promise.resolve({ data: null }),
            ])

            return {
              type: 'comment',
              id: comment.id,
              created_at: comment.created_at,
              content: comment.content,
              post_id: comment.post_id,
              post_title: postData?.title || '삭제된 게시글',
              post_author: postProfileResult.data?.name || postProfileResult.data?.nickname || '알 수 없음',
              user: {
                email: profileResult.data?.email || null,
                name: profileResult.data?.name || null,
                nickname: profileResult.data?.nickname || null,
                avatar_url: profileResult.data?.avatar_url || null,
                company: profileResult.data?.company || null,
                team: profileResult.data?.team || null,
                position: profileResult.data?.position || null,
              },
            }
          })
        )

        const allActivities = [...postsWithMetadata, ...commentsWithMetadata]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50)

        setActivities(allActivities)
      } catch (error) {
        console.error('나의 활동 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMyActivities()
  }, [user?.id])

  // 시간 경과 계산 함수
  const getTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`
    return `${Math.floor(diffInSeconds / 31536000)}년 전`
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
        <Link
          href="/login"
          className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-ok-dark transition-colors"
        >
          로그인하기
        </Link>
      </div>
    )
  }

  // 게시글과 댓글 분리
  const posts = activities.filter((a: any) => a.type === 'post')
  const comments = activities.filter((a: any) => a.type === 'comment')

  const displayName = profile?.nickname || profile?.name || user?.email?.split('@')[0] || '익명'
  const avatarUrl = profile?.avatar_url
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div>
      {/* 페이지 제목 및 설명 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">나의 활동</h1>
        <p className="text-gray-600 text-base">
          내가 작성한 게시글, 댓글, AI CoP 가입 내역을 확인할 수 있습니다.
        </p>
      </div>

      {/* 프로필 정보 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* 프로필 사진 */}
          {avatarUrl ? (
            <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-ok-primary flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
              {initial}
            </div>
          )}
          
          {/* 프로필 정보 */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h3>
            {profile && (profile.company || profile.team || profile.position) && (
              <div className="text-sm text-gray-600 mb-2">
                {[profile.company, profile.team, profile.position].filter(Boolean).join(' ')}
              </div>
            )}
            {user?.email && (
              <div className="text-sm text-gray-500">{user.email}</div>
            )}
          </div>
          
          {/* 프로필 수정 버튼 */}
          <Link
            href="/profile"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-ok-primary text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
          >
            프로필 수정
          </Link>
        </div>
      </div>

      {/* 나의 뱃지 */}
      {user && <MyBadges userId={user.id} />}

      {/* 활동 포인트 현황 */}
      <div className="mb-6">
        <button
          onClick={() => setShowPointsModal(true)}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">활동 포인트</h2>
              <span className="text-xs text-gray-400">클릭하여 상세 보기</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-ok-primary">{totalPoints}</span>
              <span className="text-gray-500 text-sm ml-1">점</span>
            </div>
          </div>
          {myPoints.length > 0 ? (
            <div className="space-y-2">
              {myPoints.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      p.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.points > 0 ? '+' : ''}{p.points}
                    </span>
                    <span className="text-sm text-gray-700">{p.description || p.activity_type}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
              {allMyPoints.length > 3 && (
                <p className="text-xs text-ok-primary text-center pt-2">+ {allMyPoints.length - 3}건 더보기</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">아직 포인트 내역이 없습니다.</p>
          )}
        </button>
      </div>

      {/* 포인트 상세 모달 */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPointsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">활동 포인트 상세</h3>
                <button onClick={() => setShowPointsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-gray-600">총 포인트</span>
                <span className="text-2xl font-bold text-ok-primary">{totalPoints}점</span>
              </div>
            </div>

            {/* 포인트 기준표 */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-2">포인트 기준</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {pointSettings.filter((s: any) => s.points > 0).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-semibold text-gray-900">{s.points}점</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 포인트 내역 */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 260px)' }}>
              {allMyPoints.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {allMyPoints.map((p: any) => {
                    const settingLabel = pointSettings.find((s: any) => s.activity_type === p.activity_type)?.label || p.activity_type
                    return (
                      <div key={p.id} className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                            p.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {p.points > 0 ? '+' : ''}{p.points}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{settingLabel}</div>
                            {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(p.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">포인트 내역이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI CoP 가입 내역 */}
      {myCops.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">AI CoP 가입 내역</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCops.map((membership: any) => (
              <Link
                key={membership.id}
                href={`/cop/${membership.cop_id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {membership.cop?.image_url ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={membership.cop.image_url}
                        alt={membership.cop.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg flex-shrink-0">
                      {membership.cop?.name?.charAt(0) || 'C'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{membership.cop?.name}</h3>
                    {membership.cop?.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{membership.cop.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        membership.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : membership.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {membership.status === 'approved' ? '승인됨' : membership.status === 'pending' ? '대기중' : '거절됨'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {membership.member_count}/{membership.cop?.max_members}명
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 좌우 분할 레이아웃 */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* 좌측: 게시글 */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-4">내 게시글</h2>
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <p className="text-gray-500 mb-4">작성한 게시글이 없습니다.</p>
              <Link
                href="/post/new"
                className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors"
              >
                게시글 작성하기
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {posts.map((post: any) => (
                <PostListItem key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* 우측: 댓글 */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-4">내 댓글</h2>
          {comments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <p className="text-gray-500">작성한 댓글이 없습니다.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {comments.map((comment: any) => {
                const displayName = comment.user?.nickname || comment.user?.name || comment.user?.email?.split('@')[0] || '익명'
                const initial = displayName.charAt(0).toUpperCase()
                
                return (
                  <div key={comment.id} className="border-b border-gray-200 last:border-b-0 p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* 프로필 사진 */}
                      {comment.user?.avatar_url ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          <img
                            src={comment.user.avatar_url}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-semibold text-sm flex-shrink-0">
                          {initial}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{displayName}</span>
                          <span className="text-xs text-gray-500">{getTimeAgo(new Date(comment.created_at))}</span>
                        </div>
                        
                        <p className="text-gray-900 mb-3 whitespace-pre-wrap line-clamp-3">{comment.content}</p>
                        
                        {/* 댓글이 달린 게시글 링크 */}
                        <Link
                          href={`/post/${comment.post_id}`}
                          className="text-sm text-gray-600 hover:text-ok-primary transition-colors inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-medium">{comment.post_title}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MyBadges({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<{ id: string; name: string; image: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBadges() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: userBadges } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', userId)

        if (!userBadges || userBadges.length === 0) {
          setLoading(false)
          return
        }

        const badgeIds = userBadges.map((b: any) => b.badge_id)

        const { data: definitions } = await supabase
          .from('badge_definitions')
          .select('id, name, image_path')
          .in('id', badgeIds)

        if (definitions && definitions.length > 0) {
          setBadges(definitions.map((d: any) => ({
            id: d.id,
            name: d.name,
            image: d.image_path,
          })))
        } else {
          const { DEFAULT_BADGES } = await import('@/lib/badges')
          setBadges(
            badgeIds
              .map((bid: string) => DEFAULT_BADGES.find(b => b.id === bid))
              .filter(Boolean) as any[]
          )
        }
      } catch (err) {
        console.error('뱃지 조회 오류:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBadges()
  }, [userId])

  if (loading || badges.length === 0) return null

  return (
    <div className="mb-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">나의 뱃지</h2>
        <div className="flex flex-wrap gap-4">
          {badges.map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl min-w-[80px]">
              <Image
                src={badge.image}
                alt={badge.name}
                width={48}
                height={48}
                className="object-contain"
              />
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
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
