'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

interface SearchResult {
  posts: Array<{
    id: string
    title: string
    content: string
    created_at: string
    user_id: string
    user?: {
      email: string
      nickname?: string
    }
  }>
  news: Array<{
    id: string
    title: string
    content: string
    created_at: string
    user_id?: string
    author_name?: string
    source_site?: string
  }>
}

export default function Navbar() {
  const { user, loading } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = user?.email === ADMIN_EMAIL
  const isApproved = profile?.status === 'approved' || isAdmin
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchFormRef = useRef<HTMLFormElement>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // 검색 API 호출
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      } else {
        setSearchResults({ posts: [], news: [] })
      }
    } catch (error) {
      console.error('검색 오류:', error)
      setSearchResults({ posts: [], news: [] })
    } finally {
      setIsSearching(false)
    }
  }

  // 검색어 변경 시 디바운스 처리
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 300) // 300ms 디바운스
    } else {
      setSearchResults(null)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // 검색 결과 클릭 시 검색창 닫기
  const handleResultClick = () => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults(null)
  }

  // 검색창 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchFormRef.current &&
        !searchFormRef.current.contains(event.target as Node)
      ) {
        if (!searchQuery.trim()) {
          setShowSearch(false)
        }
      }
    }

    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearch, searchQuery])

  return (
    <nav className="bg-white shadow-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 왼쪽: 빈 공간 */}
          <div className="flex-1" />
          
          {/* 가운데: 로고 */}
          <div className="flex-1 flex justify-center">
            <Link 
              href={user ? "/dashboard" : "/"} 
              className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
            >
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              It's OKAI
            </Link>
          </div>
          
          {/* 오른쪽: 검색 및 사용자 메뉴 */}
          <div className="flex-1 flex items-center justify-end space-x-4">
            {/* 검색 아이콘/입력 */}
            <div className="relative flex-shrink-0">
              {showSearch ? (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div 
                    ref={searchFormRef}
                    className="flex flex-col bg-white shadow-xl rounded-lg border border-gray-200"
                    style={{ width: '450px', maxHeight: '600px' }}
                  >
                    {/* 검색 입력창 - 항상 상단에 고정 */}
                    <form 
                      onSubmit={(e) => e.preventDefault()} 
                      className="flex items-center gap-2 p-2 border-b border-gray-200 flex-shrink-0"
                    >
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="검색어를 입력하세요..."
                        className="px-4 py-2 focus:outline-none text-sm flex-1 border border-gray-300 rounded-md focus:border-ok-primary focus:ring-1 focus:ring-ok-primary"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setShowSearch(false)
                          setSearchQuery('')
                          setSearchResults(null)
                        }}
                        className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-2 hover:bg-gray-100 rounded-md transition-colors"
                        title="닫기"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </form>
                    
                    {/* 검색 결과 - 스크롤 가능한 영역 */}
                    {searchQuery.trim() && (
                      <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
                        {isSearching ? (
                          <div className="p-6 text-center text-gray-500 text-sm">
                            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-ok-primary mr-2"></div>
                            검색 중...
                          </div>
                        ) : searchResults ? (
                          <>
                            {/* Posts 결과 */}
                            {searchResults.posts.length > 0 && (
                              <div className="p-2">
                                <div className="text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50 rounded-t">AI 활용 사례</div>
                                {searchResults.posts.map((post) => (
                                  <Link
                                    key={post.id}
                                    href={`/post/${post.id}`}
                                    onClick={handleResultClick}
                                    className="block px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                                  >
                                    <div className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">{post.title}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2">{post.content.replace(/<[^>]*>/g, '').substring(0, 120)}</div>
                                  </Link>
                                ))}
                              </div>
                            )}
                            
                            {/* News 결과 */}
                            {searchResults.news.length > 0 && (
                              <div className="p-2">
                                <div className="text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50 rounded-t">최신 AI 소식</div>
                                {searchResults.news.map((news) => (
                                  <Link
                                    key={news.id}
                                    href={`/news/${news.id}`}
                                    onClick={handleResultClick}
                                    className="block px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                                  >
                                    <div className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">{news.title}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2">{news.content.replace(/<[^>]*>/g, '').substring(0, 120)}</div>
                                  </Link>
                                ))}
                              </div>
                            )}
                            
                            {/* 결과 없음 */}
                            {searchResults.posts.length === 0 && searchResults.news.length === 0 && (
                              <div className="p-6 text-center text-gray-500 text-sm">
                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>해당 내용이 없습니다</div>
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                  title="검색"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* 사용자 메뉴 - 검색창이 열려도 위치 유지 */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {loading ? (
                <div className="text-gray-500 text-sm whitespace-nowrap">로딩 중...</div>
              ) : user ? (
                <>
                  {!isApproved && profile && (
                    <span className="text-yellow-600 text-sm px-3 whitespace-nowrap">승인 대기 중</span>
                  )}
                  <UserMenu />
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-red-600 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-ok-primary px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
