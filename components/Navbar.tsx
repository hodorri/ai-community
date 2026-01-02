'use client'

import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import YutmanCharacter from '@/components/ui/YutmanCharacter'
import UserMenu from '@/components/UserMenu'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

export default function Navbar() {
  const { user, loading } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = user?.email === ADMIN_EMAIL
  const isApproved = profile?.status === 'approved' || isAdmin

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <Link 
              href={user ? "/dashboard" : "/"} 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="hidden sm:block">
                <YutmanCharacter size={40} />
              </div>
              <span className="text-xl font-bold text-ok-primary hover:text-ok-dark transition-colors">
                OK AI Community
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-gray-500">로딩 중...</div>
            ) : user ? (
              <>
                {!isApproved && profile && (
                  <span className="text-yellow-600 text-sm px-3">승인 대기 중</span>
                )}
                <UserMenu />
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-ok-primary px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
