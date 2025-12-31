'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import PostCard from '@/components/post/PostCard'
import YutmanCharacter from '@/components/ui/YutmanCharacter'

type TabType = 'all' | 'diary' | 'news' | 'cases' | 'study'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>(user ? 'all' : 'diary')
  
  useEffect(() => {
    if (user) {
      setActiveTab('all')
    } else {
      setActiveTab('diary')
    }
  }, [user])

  // 비로그인 사용자에게는 랜딩 페이지 표시
  if (!user && !authLoading) {
    return <LandingPage />
  }

  // 로그인한 사용자에게는 탭 구조 표시
  const tabs = [
    { id: 'all' as TabType, label: '전체', showOnlyWhenLoggedIn: true },
    { id: 'diary' as TabType, label: '개발 일지', showOnlyWhenLoggedIn: false },
    { id: 'news' as TabType, label: '최신 AI News', showOnlyWhenLoggedIn: false },
    { id: 'cases' as TabType, label: 'AI로도 OK! AI 활용 사례', showOnlyWhenLoggedIn: false },
    { id: 'study' as TabType, label: 'AI Study', showOnlyWhenLoggedIn: false },
  ]

  const visibleTabs = tabs.filter(tab => !tab.showOnlyWhenLoggedIn || user)

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">OK AI Community</h1>
        <p className="text-gray-600">AI 개발자들을 위한 커뮤니티</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-ok-primary text-ok-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="mt-6">
        {activeTab === 'all' && user && (
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">개발 일지</h2>
              <DiaryContent />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">최신 AI News</h2>
              <NewsContent />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">AI로도 OK! AI 활용 사례</h2>
              <CasesContent />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">AI Study</h2>
              <StudyContent />
            </div>
          </div>
        )}

        {activeTab === 'diary' && <DiaryContent />}
        {activeTab === 'news' && <NewsContent />}
        {activeTab === 'cases' && <CasesContent />}
        {activeTab === 'study' && <StudyContent />}
      </div>
    </div>
  )
}

// 랜딩 페이지 컴포넌트
function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2 min-h-[600px]">
          {/* 왼쪽: 흰색 배경 */}
          <div className="bg-white flex items-center px-8 lg:px-16 py-16">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-ok-primary uppercase tracking-wide mb-4">
                INNOVATIVE SOLUTION FOR AI COMMUNITY
              </p>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                OK AI Community에<br />오신 것을 환영합니다
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                AI 개발자들이 함께 성장하고 지식을 공유하는 커뮤니티에 오신 것을 환영합니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="bg-ok-primary text-white px-8 py-4 rounded-full font-semibold hover:bg-ok-dark transition-colors text-center shadow-lg hover:shadow-xl"
                >
                  시작하기
                </Link>
                <Link
                  href="/login"
                  className="border-2 border-ok-primary text-ok-primary px-8 py-4 rounded-full font-semibold hover:bg-ok-light transition-colors text-center"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>

          {/* 오른쪽: 그라데이션 배경 */}
          <div className="gradient-ok flex items-center justify-center px-8 lg:px-16 py-16 relative">
            <div className="relative z-10 flex flex-col items-center">
              {/* 읏맨 캐릭터 */}
              <div className="mb-6 animate-bounce-slow">
                <YutmanCharacter size={180} />
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-2xl w-full max-w-md">
                <div className="text-white text-center">
                  <h2 className="text-3xl font-bold mb-4">OK AI Community</h2>
                  <p className="text-lg mb-6 opacity-90">
                    개발 일지, AI News, 활용 사례, Study까지<br />
                    모든 것을 한 곳에서
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="text-xl font-bold">개발 일지</div>
                      <div className="text-xs opacity-80">일상 공유</div>
                    </div>
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="text-xl font-bold">AI News</div>
                      <div className="text-xs opacity-80">최신 소식</div>
                    </div>
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="text-xl font-bold">활용 사례</div>
                      <div className="text-xs opacity-80">실전 경험</div>
                    </div>
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="text-xl font-bold">AI Study</div>
                      <div className="text-xs opacity-80">학습 자료</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 장식 요소 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      </section>

      {/* 최근 게시글 섹션 */}
      <section className="bg-gray-50 py-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">RECENTLY ADDED POSTS:</h2>
          <RecentPostsPreview />
        </div>
      </section>
    </div>
  )
}

// 최근 게시글 미리보기
function RecentPostsPreview() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api/posts?limit=5')
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">아직 작성된 게시글이 없습니다.</p>
        <Link
          href="/signup"
          className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-ok-dark transition-colors"
        >
          첫 게시글 작성하기
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {posts.map((post: any) => (
        <Link
          key={post.id}
          href={`/post/${post.id}`}
          className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow"
        >
          <div className="mb-4">
            <div className="w-12 h-12 bg-ok-primary/10 rounded-full flex items-center justify-center mb-3">
              <span className="text-ok-primary font-bold text-lg">
                {post.user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
            <p className="text-sm text-gray-500 mb-2">{post.user?.email || 'Unknown'}</p>
            <p className="text-xs text-gray-400">
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              ❤️ {post.likes_count || 0} · 💬 {post.comments_count || 0}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

// 개발 일지 컴포넌트
function DiaryContent() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api/posts')
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">아직 작성된 게시글이 없습니다.</p>
        <Link
          href="/post/new"
          className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-ok-dark transition-colors"
        >
          첫 게시글 작성하기
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post: any) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

// 최신 AI News 컴포넌트
function NewsContent() {
  return (
    <div className="text-center py-12">
      <div className="bg-gradient-ok-subtle rounded-2xl p-12">
        <p className="text-gray-600 mb-2 text-lg">최신 AI News 기능은 준비 중입니다.</p>
        <p className="text-sm text-gray-400">곧 만나보실 수 있습니다.</p>
      </div>
    </div>
  )
}

// AI 활용 사례 컴포넌트
function CasesContent() {
  return (
    <div className="text-center py-12">
      <div className="bg-gradient-ok-subtle rounded-2xl p-12">
        <p className="text-gray-600 mb-2 text-lg">AI 활용 사례 기능은 준비 중입니다.</p>
        <p className="text-sm text-gray-400">곧 만나보실 수 있습니다.</p>
      </div>
    </div>
  )
}

// AI Study 컴포넌트
function StudyContent() {
  return (
    <div className="text-center py-12">
      <div className="bg-gradient-ok-subtle rounded-2xl p-12">
        <p className="text-gray-600 mb-2 text-lg">AI Study 기능은 준비 중입니다.</p>
        <p className="text-sm text-gray-400">곧 만나보실 수 있습니다.</p>
      </div>
    </div>
  )
}
