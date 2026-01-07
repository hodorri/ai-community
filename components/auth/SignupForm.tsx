'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const router = useRouter()
  const supabase = createClient()

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

    // 먼저 profiles 테이블에서 이메일 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      setError('이미 가입된 사용자입니다.')
      setLoading(false)
      return
    }

    console.log('[회원가입] 시작:', { email, name: name.trim() })

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: name.trim(),
          employee_number: employeeNumber.trim(),
        },
      },
    })

    console.log('[회원가입] signUp 응답:', { 
      user: data?.user?.id, 
      session: data?.session?.user?.id,
      error: signUpError,
      needsEmailConfirmation: data?.user && !data.session
    })

    if (signUpError) {
      console.error('[회원가입] signUp 오류:', signUpError)
      // 이미 존재하는 사용자인 경우
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
        setError('이미 가입된 사용자입니다.')
      } else {
        setError(`회원가입 실패: ${signUpError.message}`)
      }
      setLoading(false)
      return
    }

    if (!data.user) {
      console.error('[회원가입] 사용자 생성 실패: data.user가 null')
      setError('회원가입에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    // 이메일 인증이 필요한 경우 확인
    if (!data.session) {
      console.warn('[회원가입] 이메일 인증 필요 - 세션이 없음')
      // 이메일 인증이 필요한 경우에도 사용자는 생성되었으므로 계속 진행
    }

    // 프로필 저장 - 클라이언트에서 직접 처리
    console.log('[회원가입] 프로필 저장 시작:', {
      userId: data.user.id,
      email: email,
      name: name.trim(),
      employeeNumber: employeeNumber.trim(),
      company: company.trim() || null,
      team: team.trim() || null,
      position: position.trim() || null,
    })

    // 세션 명시적으로 새로고침
    const { data: sessionData } = await supabase.auth.getSession()
    console.log('[회원가입] 세션 확인:', sessionData.session?.user?.id)

    // 트리거가 프로필을 생성할 시간을 주기 위해 약간의 지연
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 먼저 API 라우트를 통해 시도 (서비스 롤 키 사용)
    let profileSaved = false
    let lastError: any = null

    try {
      console.log('[회원가입] API 라우트를 통한 프로필 저장 시도')
      const profileResponse = await fetch('/api/signup-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: email,
          name: name.trim(),
          employeeNumber: employeeNumber.trim(),
          company: company.trim() || null,
          team: team.trim() || null,
          position: position.trim() || null,
        }),
      })

      const profileResult = await profileResponse.json()

      if (profileResponse.ok && profileResult.success) {
        console.log('[회원가입] API를 통한 프로필 저장 성공:', profileResult.data)
        profileSaved = true
      } else {
        console.error('[회원가입] API를 통한 프로필 저장 실패:', profileResult)
        lastError = profileResult
      }
    } catch (err: any) {
      console.error('[회원가입] API 호출 예외:', err)
      lastError = err
    }

    // API가 실패하면 클라이언트에서 직접 시도
    if (!profileSaved) {
      console.log('[회원가입] 클라이언트에서 직접 프로필 저장 시도')
      let retryCount = 0
      const maxRetries = 10

      while (!profileSaved && retryCount < maxRetries) {
        // 먼저 프로필이 존재하는지 확인
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, name, employee_number, company, team, position')
          .eq('id', data.user.id)
          .maybeSingle()

        console.log(`[회원가입] 프로필 확인 시도 ${retryCount + 1}:`, existingProfile ? '존재함' : '없음', checkError)

        if (existingProfile) {
          // 프로필이 존재하면 업데이트
          const updateData: any = {
            name: name.trim() || null,
            employee_number: employeeNumber.trim() || null,
            company: company.trim() || null,
            team: team.trim() || null,
            position: position.trim() || null,
            status: 'pending',
          }

          console.log('[회원가입] 업데이트 데이터:', updateData)

          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', data.user.id)
            .select()
            .single()

          if (!updateError && updatedProfile) {
            console.log('[회원가입] 프로필 업데이트 성공:', updatedProfile)
            profileSaved = true
            break
          } else {
            console.error('[회원가입] 프로필 업데이트 오류:', updateError)
            lastError = updateError
          }
        } else {
          // 프로필이 없으면 생성 시도
          if (retryCount >= 3) {
            console.log('[회원가입] 프로필 직접 생성 시도')
            const insertData = {
              id: data.user.id,
              email: email,
              name: name.trim() || null,
              employee_number: employeeNumber.trim() || null,
              company: company.trim() || null,
              team: team.trim() || null,
              position: position.trim() || null,
              status: 'pending',
            }

            console.log('[회원가입] 생성 데이터:', insertData)

            const { data: insertedProfile, error: insertError } = await supabase
              .from('profiles')
              .insert(insertData)
              .select()
              .single()

            if (!insertError && insertedProfile) {
              console.log('[회원가입] 프로필 생성 성공:', insertedProfile)
              profileSaved = true
              break
            } else {
              console.error('[회원가입] 프로필 생성 오류:', insertError)
              lastError = insertError
            }
          }
        }

        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    if (!profileSaved) {
      console.error('[회원가입] 프로필 저장 실패: 최대 재시도 횟수 초과', lastError)
      setError(`프로필 저장에 실패했습니다: ${lastError?.message || lastError?.error || '알 수 없는 오류'}. 관리자에게 문의해주세요.`)
      setLoading(false)
      return
    }

    // 저장 후 실제로 저장되었는지 확인
    await new Promise(resolve => setTimeout(resolve, 500))
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('name, employee_number, company, team, position')
      .eq('id', data.user.id)
      .single()

    if (verifyError || !verifyProfile) {
      console.error('[회원가입] 프로필 저장 확인 실패:', verifyError)
      setError('프로필이 저장되었지만 확인에 실패했습니다. 페이지를 새로고침해주세요.')
      setLoading(false)
      return
    }

    console.log('[회원가입] 프로필 저장 확인 완료:', verifyProfile)

    // 관리자에게 이메일 알림 발송 (회원가입 폼에서 입력한 값 직접 전달)
    try {
      const notifyResponse = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userEmail: email,
          userName: name.trim(),
          employeeNumber: employeeNumber.trim(),
          company: company.trim() || null,
          team: team.trim() || null,
          position: position.trim() || null,
        }),
      })

      if (!notifyResponse.ok) {
        console.error('관리자 알림 발송 실패:', await notifyResponse.text())
      }
    } catch (err) {
      console.error('관리자 알림 발송 실패:', err)
      // 이메일 발송 실패해도 회원가입은 성공으로 처리
    }

    // 회원가입 성공 - 관리자 승인 대기 안내
    alert('회원가입이 완료되었습니다!\n관리자 승인 후 서비스를 이용하실 수 있습니다.')
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSignup} className="space-y-6 w-full">
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
        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="홍길동"
        />
      </div>
      <div>
        <label htmlFor="employeeNumber" className="block text-sm font-semibold text-gray-700 mb-2">
          사번 <span className="text-red-500">*</span>
        </label>
        <input
          id="employeeNumber"
          type="text"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="사번을 입력하세요"
        />
        <p className="text-xs text-gray-500 mt-1">회사 직원 확인을 위해 필요합니다.</p>
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
          회사
        </label>
        <input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="회사명을 입력하세요"
        />
      </div>
      <div>
        <label htmlFor="team" className="block text-sm font-semibold text-gray-700 mb-2">
          소속 팀
        </label>
        <input
          id="team"
          type="text"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="소속 팀을 입력하세요"
        />
      </div>
      <div>
        <label htmlFor="position" className="block text-sm font-semibold text-gray-700 mb-2">
          직급
        </label>
        <input
          id="position"
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="직급을 입력하세요"
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
        <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
          비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ok-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
      >
        {loading ? '가입 중...' : '회원가입'}
      </button>
    </form>
  )
}
