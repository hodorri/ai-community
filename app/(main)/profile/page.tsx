'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [company, setCompany] = useState('')
  const [team, setTeam] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (profile) {
      setName(profile.name || '')
      setNickname(profile.nickname || '')
      setAvatarUrl(profile.avatar_url || '')
      setEmployeeNumber(profile.employee_number || '')
      setCompany(profile.company || '')
      setTeam(profile.team || '')
      setPosition(profile.position || '')
    }
  }, [user, profile, authLoading, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setLoading(true)
    setError(null)

    try {
      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB 이하여야 합니다.')
      }

      // 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다.')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // 클라이언트에서 직접 Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(uploadError.message || '파일 업로드에 실패했습니다.')
      }

      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      setAvatarUrl(publicUrl)

      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // API 라우트를 통해 프로필에 avatar_url 업데이트
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          avatar_url: publicUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '프로필 업데이트에 실패했습니다.')
      }

      // 프로필 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('profile-updated'))
    } catch (err: any) {
      const errorMessage = err.message || '이미지 업로드에 실패했습니다.'
      setError(errorMessage)
      console.error('Upload error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // API 라우트를 통해 프로필 업데이트 (서버 사이드에서 처리)
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: name || null,
          nickname: nickname || null,
          avatar_url: avatarUrl || null,
          employee_number: employeeNumber || null,
          company: company || null,
          team: team || null,
          position: position || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '프로필 업데이트에 실패했습니다.')
      }

      setSuccess(true)
      
      // 프로필 업데이트 이벤트 발생 (다른 컴포넌트들이 프로필을 다시 가져오도록)
      window.dispatchEvent(new CustomEvent('profile-updated'))
      
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || '프로필 업데이트에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">뒤로 돌아가기</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">프로필 설정</h1>
        <p className="text-gray-600">계정 정보를 수정할 수 있습니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-8 space-y-6">
        {/* 프로필 사진 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            프로필 사진
          </label>
          <div className="flex items-center gap-6">
            {avatarUrl ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={avatarUrl}
                  alt="프로필"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-ok-primary flex items-center justify-center text-white font-bold text-2xl">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ok-primary file:text-white hover:file:bg-ok-dark file:cursor-pointer disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">JPG, PNG 파일만 업로드 가능 (최대 5MB)</p>
            </div>
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            이름
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            placeholder="이름을 입력하세요"
          />
        </div>

        {/* 닉네임 */}
        <div>
          <label htmlFor="nickname" className="block text-sm font-semibold text-gray-700 mb-2">
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            placeholder="닉네임을 입력하세요"
          />
          <p className="text-xs text-gray-500 mt-1">닉네임이 우선적으로 표시됩니다.</p>
        </div>

        {/* 사번 */}
        <div>
          <label htmlFor="employeeNumber" className="block text-sm font-semibold text-gray-700 mb-2">
            사번
          </label>
          <input
            id="employeeNumber"
            type="text"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            placeholder="사번을 입력하세요"
          />
        </div>

        {/* 소속 회사 */}
        <div>
          <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
            소속 회사
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            placeholder="소속 회사를 입력하세요"
          />
        </div>

        {/* 소속 팀 */}
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

        {/* 직급/책 */}
        <div>
          <label htmlFor="position" className="block text-sm font-semibold text-gray-700 mb-2">
            직급/책
          </label>
          <input
            id="position"
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
            placeholder="직급/책을 입력하세요"
          />
        </div>

        {/* 이메일 (읽기 전용) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            이메일
          </label>
          <input
            type="email"
            value={user.email || ''}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-2 border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm">
            프로필이 성공적으로 업데이트되었습니다!
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-ok-primary text-white rounded-xl font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
