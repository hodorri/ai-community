'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CoP } from '@/lib/types/database'
import Image from 'next/image'

// 관리자 이메일 (환경 변수에서 가져오거나 설정)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

type TabType = 'users' | 'cops'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [allCops, setAllCops] = useState<CoP[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && user.email !== ADMIN_EMAIL) {
      router.push('/')
      return
    }

    if (user && user.email === ADMIN_EMAIL) {
      fetchAllUsers()
      fetchAllCops()
    }
  }, [user, authLoading, router])

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
      // 먼저 cops만 조회 (조인 없이)
      const { data: copsData, error: copsError } = await supabase
        .from('cops')
        .select('*')
        .order('created_at', { ascending: false })

      if (copsError) {
        console.error('Error fetching cops:', copsError)
        setAllCops([])
        return
      }

      if (!copsData || copsData.length === 0) {
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

      setAllCops(copsWithUsers)
    } catch (error) {
      console.error('Error fetching cops:', error)
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null
  }

  const filteredCops = filterStatus === 'all' 
    ? allCops 
    : allCops.filter(c => c.status === filterStatus)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        
        {/* 메인 탭 (사용자 관리 / CoP 관리) */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
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
        </div>

        <p className="text-gray-600 mb-4">
          {activeTab === 'users' ? '사용자 관리' : 'CoP 관리'}
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
      ) : (
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
      )}
    </div>
  )
}
