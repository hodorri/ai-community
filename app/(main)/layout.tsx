'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ApprovalBanner from '@/components/ApprovalBanner'
import TabNavigation from '@/components/TabNavigation'
import { useAuth } from '@/hooks/useAuth'

type TabType = 'all' | 'notice' | 'guide' | 'greeting' | 'diary' | 'news' | 'cases' | 'study' | 'cop-log' | 'engineer' | 'activity'

function MainLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  // URL 경로에 따라 활성 탭 결정
  const getActiveTab = (): TabType => {
    // 가이드 페이지인 경우
    if (pathname === '/guide') {
      return 'guide'
    }
    
    // 가입인사 페이지인 경우
    if (pathname === '/greeting') {
      return 'greeting'
    }
    
    // AI 활용사례 페이지인 경우
    if (pathname === '/cases') {
      return 'cases'
    }
    
    // 대시보드 페이지인 경우
    if (pathname === '/dashboard') {
      const tabParam = searchParams.get('tab')
      if (tabParam && ['all', 'notice', 'guide', 'greeting', 'diary', 'news', 'cases', 'study', 'cop-log', 'engineer', 'activity'].includes(tabParam)) {
        return tabParam as TabType
      }
      return user ? 'all' : 'diary'
    }
    
    // CoP 활동일지 페이지인 경우
    if (pathname?.startsWith('/cop-log/') || pathname === '/cop-log') {
      return 'cop-log'
    }

    // 공지사항 상세 페이지인 경우
    if (pathname?.startsWith('/notice/')) {
      return 'notice'
    }

    // 게시글 상세 페이지인 경우
    if (pathname?.startsWith('/post/')) {
      return 'diary'
    }
    
    // 뉴스 상세 페이지인 경우
    if (pathname?.startsWith('/news/')) {
      return 'news'
    }
    
    // CoP 상세 페이지인 경우
    if (pathname?.startsWith('/cop/')) {
      return 'study'
    }
    
    // 기본값
    return user ? 'all' : 'diary'
  }

  const activeTab = getActiveTab()

  const handleTabChange = (tab: TabType) => {
    if (tab === 'all') {
      router.push('/dashboard')
    } else if (tab === 'notice') {
      router.push(`/dashboard?tab=${tab}`)
    } else if (tab === 'cop-log') {
      router.push(`/dashboard?tab=${tab}`)
    } else if (tab === 'engineer') {
      router.push(`/dashboard?tab=${tab}`)
    } else if (tab === 'guide') {
      router.push('/guide')
    } else if (tab === 'greeting') {
      router.push('/greeting')
    } else if (tab === 'cases') {
      router.push('/cases')
    } else {
      router.push(`/dashboard?tab=${tab}`)
    }
  }

  // TabNavigation을 표시할 경로 (admin, profile 등은 제외)
  const shouldShowTabNavigation = !pathname?.startsWith('/admin') && 
                                   !pathname?.startsWith('/profile') &&
                                   pathname !== '/post/new' &&
                                   pathname !== '/news/new' &&
                                   pathname !== '/notice/new' &&
                                   pathname !== '/cop-log/new'

  return (
    <>
      <Navbar />
      <main className="bg-gray-50 min-h-screen">
        <ApprovalBanner />
        {shouldShowTabNavigation && (
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        )}
        {children}
      </main>
    </>
  )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main className="bg-gray-50 min-h-screen">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        </main>
      </>
    }>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  )
}
