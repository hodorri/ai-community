'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CoP } from '@/lib/types/database'
import Image from 'next/image'

// 관리자 이메일 (환경 변수에서 가져오거나 설정)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

type TabType = 'users' | 'cops' | 'news'
type NewsFilterType = 'all' | 'crawled' | 'published'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [allCops, setAllCops] = useState<CoP[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [newsFilter, setNewsFilter] = useState<NewsFilterType>('all')
  const [crawling, setCrawling] = useState(false)
  const [crawledNews, setCrawledNews] = useState<Array<{
    title: string
    content: string
    sourceUrl: string
    sourceSite: string
    isDuplicate: boolean
  }>>([])
  const [selectedNews, setSelectedNews] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [publishedNews, setPublishedNews] = useState<any[]>([])

  useEffect(() => {
    const checkAdmin = async () => {
      if (!authLoading && !user) {
        router.push('/login')
        return
      }

      if (!user) return

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle()

        const adminCheck = profile?.email === ADMIN_EMAIL
        setIsAdmin(adminCheck)

        if (!adminCheck) {
          router.push('/')
          return
        }

        if (adminCheck) {
          fetchAllUsers()
          fetchAllCops()
        }
      } catch (error) {
        console.error('관리자 확인 오류:', error)
        setIsAdmin(false)
        router.push('/')
      }
    }

    checkAdmin()
  }, [user, authLoading, router, supabase])

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setAllUsers(data as Profile[])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCops = async () => {
    try {
      console.log('[관리자] CoP 조회 시작')
      // 먼저 cops만 조회 (조인 없이)
      const { data: copsData, error: copsError } = await supabase
        .from('cops')
        .select('*')
        .order('created_at', { ascending: false })

      if (copsError) {
        console.error('[관리자] CoP 조회 오류:', copsError)
        setAllCops([])
        return
      }

      console.log('[관리자] 조회된 CoP 개수:', copsData?.length || 0)
      console.log('[관리자] CoP 데이터:', copsData)

      if (!copsData || copsData.length === 0) {
        console.log('[관리자] CoP 데이터가 없습니다.')
        setAllCops([])
        return
      }

      // 각 cop의 user_id로 profiles 조회
      const copsWithUsers = await Promise.all(
        copsData.map(async (cop) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, name, nickname')
            .eq('id', cop.user_id)
            .maybeSingle()

          return {
            ...cop,
            user: profileData || null,
          } as CoP
        })
      )

      console.log('[관리자] 프로필 정보 포함된 CoP:', copsWithUsers)
      console.log('[관리자] pending 상태 CoP:', copsWithUsers.filter(c => c.status === 'pending'))
      setAllCops(copsWithUsers)
    } catch (error) {
      console.error('[관리자] CoP 조회 예외:', error)
      setAllCops([])
    }
  }

  const filteredUsers = filterStatus === 'all' 
    ? allUsers 
    : allUsers.filter(u => u.status === filterStatus)

  const handleApprove = async (userId: string) => {
    try {
      // 클라이언트 사이드에서 직접 업데이트 (RLS 정책이 관리자 업데이트를 허용)
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('승인 오류:', error)
        alert('승인 실패: ' + error.message)
        return
      }

      alert('승인 완료!')
      // 목록 새로고침
      fetchAllUsers()
    } catch (error) {
      console.error('Error approving user:', error)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      // 클라이언트 사이드에서 직접 업데이트 (RLS 정책이 관리자 업데이트를 허용)
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('거부 오류:', error)
        alert('거부 실패: ' + error.message)
        return
      }

      alert('거부 완료!')
      // 목록 새로고침
      fetchAllUsers()
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('거부 중 오류가 발생했습니다.')
    }
  }

  const handleApproveCop = async (copId: string) => {
    try {
      const { data, error } = await supabase
        .from('cops')
        .update({ status: 'approved' })
        .eq('id', copId)
        .select()
        .single()

      if (error) {
        console.error('CoP 승인 오류:', error)
        alert('승인 실패: ' + error.message)
        return
      }

      alert('CoP 승인 완료!')
      fetchAllCops()
    } catch (error) {
      console.error('Error approving cop:', error)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  const handleRejectCop = async (copId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      const { data, error } = await supabase
        .from('cops')
        .update({ status: 'rejected' })
        .eq('id', copId)
        .select()
        .single()

      if (error) {
        console.error('CoP 거부 오류:', error)
        alert('거부 실패: ' + error.message)
        return
      }

      alert('CoP 거부 완료!')
      fetchAllCops()
    } catch (error) {
      console.error('Error rejecting cop:', error)
      alert('거부 중 오류가 발생했습니다.')
    }
  }

  const fetchPublishedNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_manual', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('게시된 뉴스 조회 오류:', error)
        return
      }

      setPublishedNews(data || [])
    } catch (error) {
      console.error('게시된 뉴스 조회 예외:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'news' && isAdmin) {
      fetchPublishedNews()
    }
  }, [activeTab, isAdmin, supabase])

  const handleCrawlNews = async () => {
    if (!confirm('뉴스 크롤링을 실행하시겠습니까?')) return

    try {
      setCrawling(true)
      setCrawledNews([])
      setSelectedNews(new Set())

      // 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        return
      }

      const response = await fetch('/api/crawl-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setCrawledNews(result.news || [])
        // 중복이 아닌 항목만 자동 선택
        const newSelected = new Set<number>()
        result.news?.forEach((item: any, index: number) => {
          if (!item.isDuplicate) {
            newSelected.add(index)
          }
        })
        setSelectedNews(newSelected)
        alert(`크롤링 완료!\n총 ${result.total}개 기사를 수집했습니다.`)
      } else {
        alert('크롤링 실패: ' + (result.error || result.details || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('크롤링 오류:', error)
      alert('크롤링 중 오류가 발생했습니다.')
    } finally {
      setCrawling(false)
    }
  }

  const handleToggleNewsSelection = (index: number) => {
    const newSelected = new Set(selectedNews)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedNews(newSelected)
  }

  const handleSelectAll = () => {
    const newSelected = new Set<number>()
    crawledNews.forEach((item, index) => {
      if (!item.isDuplicate) {
        newSelected.add(index)
      }
    })
    setSelectedNews(newSelected)
  }

  const handleDeselectAll = () => {
    setSelectedNews(new Set())
  }

  const handleSaveSelectedNews = async () => {
    if (selectedNews.size === 0) {
      alert('저장할 기사를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedNews.size}개 기사를 저장하시겠습니까?`)) return

    try {
      setSaving(true)

      const newsToSave = Array.from(selectedNews).map(index => {
        const item = crawledNews[index]
        return {
          title: item.title,
          content: item.content,
          sourceUrl: item.sourceUrl,
          sourceSite: item.sourceSite,
        }
      })

      const response = await fetch('/api/crawl-news/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newsItems: newsToSave }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(`저장 완료!\n${result.saved}개 기사가 저장되었습니다.`)
        // 저장된 항목 제거
        const remainingNews = crawledNews.filter((_, index) => !selectedNews.has(index))
        setCrawledNews(remainingNews)
        setSelectedNews(new Set())
        // 게시된 뉴스 목록 새로고침
        fetchPublishedNews()
      } else {
        alert('저장 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const filteredCops = filterStatus === 'all' 
    ? allCops 
    : allCops.filter(c => {
        const matches = c.status === filterStatus
        if (!matches && c.status) {
          console.log(`[필터] CoP ${c.id} 상태 불일치:`, { 
            copStatus: c.status, 
            filterStatus, 
            statusType: typeof c.status,
            filterType: typeof filterStatus
          })
        }
        return matches
      })

  console.log('[관리자] 필터 상태:', filterStatus)
  console.log('[관리자] 전체 CoP 개수:', allCops.length)
  console.log('[관리자] 필터링된 CoP 개수:', filteredCops.length)
  console.log('[관리자] 전체 CoP 상태 분포:', {
    pending: allCops.filter(c => c.status === 'pending').length,
    approved: allCops.filter(c => c.status === 'approved').length,
    rejected: allCops.filter(c => c.status === 'rejected').length,
    null: allCops.filter(c => !c.status).length,
    other: allCops.filter(c => c.status && !['pending', 'approved', 'rejected'].includes(c.status)).length
  })
  console.log('[관리자] 필터링된 CoP:', filteredCops)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        
        {/* 메인 탭 (사용자 관리 / CoP 관리 / 뉴스 관리) */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'users'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              사용자 관리
            </button>
            <button
              onClick={() => setActiveTab('cops')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'cops'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              CoP 관리
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'news'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              뉴스 관리
            </button>
          </div>
          {activeTab === 'news' && (
            <button
              onClick={handleCrawlNews}
              disabled={crawling}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                crawling
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-ok-primary text-white hover:bg-ok-dark'
              }`}
            >
              {crawling ? '크롤링 중...' : '📰 뉴스 크롤링 실행'}
            </button>
          )}
        </div>

        {activeTab !== 'news' && (
          <>
            <p className="text-gray-600 mb-4">
              {activeTab === 'users' ? '사용자 관리' : activeTab === 'cops' ? 'CoP 관리' : '뉴스 관리'}
            </p>
            
            {/* 필터 탭 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                승인 대기
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                승인됨
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                거부됨
              </button>
            </div>
          </>
        )}

        {activeTab === 'news' && (
          <>
            <p className="text-gray-600 mb-4">뉴스 관리</p>
            
            {/* 뉴스 필터 탭 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setNewsFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newsFilter === 'all'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setNewsFilter('crawled')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newsFilter === 'crawled'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                수집 내역
              </button>
              <button
                onClick={() => setNewsFilter('published')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newsFilter === 'published'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                게시됨
              </button>
            </div>
          </>
        )}
      </div>

      {activeTab === 'users' ? (
        filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? '사용자가 없습니다.' 
                : filterStatus === 'pending'
                ? '승인 대기 중인 사용자가 없습니다.'
                : filterStatus === 'approved'
                ? '승인된 사용자가 없습니다.'
                : '거부된 사용자가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사번
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.employee_number || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.status === 'pending' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            승인 대기
                          </span>
                        )}
                        {user.status === 'approved' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            승인됨
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            거부됨
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="text-ok-primary hover:text-ok-dark mr-4"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              거부
                            </button>
                          </>
                        )}
                        {user.status === 'approved' && (
                          <span className="text-green-600 text-sm">승인 완료</span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="text-red-600 text-sm">거부됨</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'cops' ? (
        filteredCops.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? 'CoP가 없습니다.' 
                : filterStatus === 'pending'
                ? '승인 대기 중인 CoP가 없습니다.'
                : filterStatus === 'approved'
                ? '승인된 CoP가 없습니다.'
                : '거부된 CoP가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대표 이미지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      활동명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      멤버 정원
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCops.map((cop) => (
                    <tr key={cop.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cop.image_url ? (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <Image
                              src={cop.image_url}
                              alt={cop.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">이미지 없음</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{cop.name}</div>
                        {cop.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">
                            {cop.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {cop.user?.name || cop.user?.nickname || cop.user?.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{cop.max_members}명</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(cop.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cop.status === 'pending' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            승인 대기
                          </span>
                        )}
                        {cop.status === 'approved' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            승인됨
                          </span>
                        )}
                        {cop.status === 'rejected' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            거부됨
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {cop.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveCop(cop.id)}
                              className="text-ok-primary hover:text-ok-dark mr-4"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectCop(cop.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              거부
                            </button>
                          </>
                        )}
                        {cop.status === 'approved' && (
                          <span className="text-green-600 text-sm">승인 완료</span>
                        )}
                        {cop.status === 'rejected' && (
                          <span className="text-red-600 text-sm">거부됨</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'news' ? (
        <>
          {/* 크롤링 결과 (수집 내역) */}
          {newsFilter === 'all' || newsFilter === 'crawled' ? (
            crawledNews.length > 0 ? (
              <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">크롤링 결과</h3>
                    <p className="text-sm text-gray-600">
                      총 {crawledNews.length}개 기사 · {selectedNews.size}개 선택됨
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      전체 해제
                    </button>
                    <button
                      onClick={handleSaveSelectedNews}
                      disabled={saving || selectedNews.size === 0}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        saving || selectedNews.size === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-ok-primary text-white hover:bg-ok-dark'
                      }`}
                    >
                      {saving ? '저장 중...' : `선택한 ${selectedNews.size}개 저장`}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {crawledNews.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${
                        item.isDuplicate
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : selectedNews.has(index)
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedNews.has(index)}
                          onChange={() => handleToggleNewsSelection(index)}
                          disabled={item.isDuplicate}
                          className="mt-1 w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                            {item.isDuplicate && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded whitespace-nowrap">
                                중복
                              </span>
                            )}
                          </div>
                          {item.content && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{item.sourceSite}</span>
                            {item.sourceUrl && (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ok-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                원문 보기 →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center">
                <p className="text-gray-500">크롤링 내역이 없습니다. 크롤링 버튼을 눌러 기사를 수집하세요.</p>
              </div>
            )
          ) : null}

          {/* 게시된 뉴스 (게시됨) */}
          {newsFilter === 'all' || newsFilter === 'published' ? (
            publishedNews.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">게시된 뉴스</h3>
                  <p className="text-sm text-gray-600 mt-1">총 {publishedNews.length}개</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {publishedNews.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                          {item.content && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {item.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{item.source_site || '네이버 뉴스'}</span>
                            <span>·</span>
                            <span>{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
                            {item.source_url && (
                              <>
                                <span>·</span>
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-ok-primary hover:underline"
                                >
                                  원문 보기 →
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center">
                <p className="text-gray-500">게시된 뉴스가 없습니다.</p>
              </div>
            )
          ) : null}
        </>
      ) : null}
    </div>
  )
}
