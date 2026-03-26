'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [company, setCompany] = useState('')
  const [team, setTeam] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    if (!employeeNumber.trim()) {
      setError('사번을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      // API 라우트를 통해 회원가입 처리 (서비스 롤 키로 이메일 인증 없이 처리)
      const res = await fetch('/api/signup-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name.trim(),
          employeeNumber: employeeNumber.trim(),
          company: company.trim() || null,
          team: team.trim() || null,
          position: position.trim() || null,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '회원가입에 실패했습니다.')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">회원가입 신청 완료!</h3>
        <p className="text-gray-600">
          관리자 승인 후 서비스를 이용하실 수 있습니다.<br />
          승인이 완료되면 로그인해주세요.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 bg-ok-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-ok-dark transition-colors"
        >
          로그인 페이지로
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignup} className="space-y-6 w-full">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">이메일 <span className="text-red-500">*</span></label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="your@email.com" />
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">이름 <span className="text-red-500">*</span></label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="홍길동" />
      </div>
      <div>
        <label htmlFor="employeeNumber" className="block text-sm font-semibold text-gray-700 mb-2">사번 <span className="text-red-500">*</span></label>
        <input id="employeeNumber" type="text" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="사번을 입력하세요" />
        <p className="text-xs text-gray-500 mt-1">회사 직원 확인을 위해 필요합니다.</p>
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">회사</label>
        <input id="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="회사명을 입력하세요" />
      </div>
      <div>
        <label htmlFor="team" className="block text-sm font-semibold text-gray-700 mb-2">소속 팀</label>
        <input id="team" type="text" value={team} onChange={(e) => setTeam(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="소속 팀을 입력하세요" />
      </div>
      <div>
        <label htmlFor="position" className="block text-sm font-semibold text-gray-700 mb-2">직급</label>
        <input id="position" type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="직급을 입력하세요" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">비밀번호 <span className="text-red-500">*</span></label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="••••••••" />
        <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">비밀번호 확인 <span className="text-red-500">*</span></label>
        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors" placeholder="••••••••" />
      </div>
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm whitespace-pre-wrap">{error}</div>
      )}
      <button type="submit" disabled={loading} className="w-full bg-ok-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg">
        {loading ? '가입 신청 중...' : '회원가입 신청'}
      </button>
    </form>
  )
}
