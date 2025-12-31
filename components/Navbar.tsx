'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import YutmanCharacter from '@/components/ui/YutmanCharacter'

export default function Navbar() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

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
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="hidden sm:block">
                <YutmanCharacter size={40} />
              </div>
              <span className="text-xl font-bold text-gray-900 hover:text-ok-primary transition-colors">
                OK AI Community
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-gray-500">로딩 중...</div>
            ) : user ? (
              <>
                <Link
                  href="/post/new"
                  className="text-gray-700 hover:text-ok-primary px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  글쓰기
                </Link>
                <span className="text-gray-600 text-sm px-3">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-ok-primary px-4 py-2 rounded-full text-sm font-medium transition-colors"
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
