'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 로그인 성공 후 프로필 상태 확인
    if (authData.user) {
      const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
      const isAdmin = authData.user.email === ADMIN_EMAIL

      // 관리자는 바로 통과
      if (isAdmin) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      // 프로필 상태 확인
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', authData.user.id)
        .single()

      // 프로필이 없거나 승인되지 않은 경우
      if (profileError || !profile || (profile.status !== 'approved')) {
        // 로그아웃 처리
        await supabase.auth.signOut()
        
        if (profile?.status === 'rejected') {
          setError('가입이 거부되었습니다. 문의사항이 있으시면 관리자에게 연락해주세요.')
    } else {
          setError('승인 대기 중입니다. 관리자 승인 후 서비스를 이용하실 수 있습니다.')
        }
        setLoading(false)
        return
      }

      // 승인된 사용자만 대시보드로 이동
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <div className={`px-4 py-3 rounded-xl text-sm ${
          error.includes('승인 대기') 
            ? 'bg-yellow-50 border-2 border-yellow-200 text-yellow-700' 
            : 'bg-red-50 border-2 border-red-200 text-red-600'
        }`}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ok-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
