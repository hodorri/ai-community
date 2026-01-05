'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

export default function Navbar() {
  const { user, loading } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = user?.email === ADMIN_EMAIL
  const isApproved = profile?.status === 'approved' || isAdmin
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // 검색 기능 구현 (필요시)
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

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
                <form 
                  onSubmit={handleSearch} 
                  className="absolute right-0 top-0 flex items-center gap-2 bg-white z-50 shadow-lg rounded-lg border border-gray-200 p-1"
                  style={{ width: '320px', transform: 'translateY(-50%)', top: '50%' }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색..."
                    className="px-4 py-2 focus:outline-none text-sm flex-1"
                    autoFocus
                    onBlur={(e) => {
                      // 포커스가 검색 폼 내부로 이동하는 경우를 고려
                      const relatedTarget = e.relatedTarget as HTMLElement
                      if (!relatedTarget || !e.currentTarget.parentElement?.contains(relatedTarget)) {
                        setTimeout(() => {
                          if (!searchQuery.trim()) {
                            setShowSearch(false)
                          }
                        }, 200)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowSearch(false)
                      setSearchQuery('')
                    }}
                    className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="text-gray-500 hover:text-gray-700 p-2"
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
