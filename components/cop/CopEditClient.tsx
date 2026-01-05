'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { CoP } from '@/lib/types/database'
import CopCreateForm from './CopCreateForm'
import Image from 'next/image'

interface CopEditClientProps {
  cop: CoP
}

interface CopMember {
  id: string
  user_id: string
  created_at: string
  status?: 'pending' | 'approved' | 'rejected'
  user?: {
    name?: string
    nickname?: string
    avatar_url?: string
    company?: string
    team?: string
    position?: string
  }
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function CopEditClient({ cop }: CopEditClientProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<CopMember[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchPendingRequests = async () => {
    if (!user) return

    try {
      const { data: requestsData, error } = await supabase
        .from('cop_members')
        .select('id, user_id, created_at, status')
        .eq('cop_id', cop.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('가입 요청 조회 오류:', error)
        return
      }

      if (!requestsData || requestsData.length === 0) {
        setPendingRequests([])
        return
      }

      // 각 요청의 프로필 정보 조회
      const requestsWithProfiles = await Promise.all(
        requestsData.map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, nickname, avatar_url, company, team, position')
            .eq('id', request.user_id)
            .maybeSingle()

          return {
            ...request,
            user: profile || null,
          } as CopMember
        })
      )

      setPendingRequests(requestsWithProfiles)
    } catch (error) {
      console.error('가입 요청 조회 오류:', error)
    }
  }

  const handleApproveMember = async (memberId: string) => {
    try {
      // 승인 전에 멤버 정보 조회 (이메일 발송용)
      const request = pendingRequests.find(r => r.id === memberId)
      let memberEmail: string | null = null
      let memberName: string | null = null

      if (request?.user_id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, name, nickname')
            .eq('id', request.user_id)
            .maybeSingle()

          if (profile) {
            memberEmail = profile.email || null
            memberName = profile.nickname || profile.name || null
          }
        } catch (err) {
          console.error('멤버 프로필 조회 오류:', err)
        }
      }

      const { error } = await supabase
        .from('cop_members')
        .update({ status: 'approved' })
        .eq('id', memberId)

      if (error) {
        throw error
      }

      // 승인된 멤버에게 이메일 알림 발송
      if (memberEmail) {
        try {
          console.log('[가입 승인] 이메일 발송 시도:', memberEmail)
          const emailResponse = await fetch('/api/notify-cop-member-approved', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              copId: cop.id,
              copName: cop.name,
              memberEmail: memberEmail,
              memberName: memberName,
            }),
          })
          
          const emailResult = await emailResponse.json()
          console.log('[가입 승인] 이메일 발송 결과:', emailResult)
          
          if (!emailResponse.ok) {
            console.error('[가입 승인] 이메일 발송 실패:', emailResult)
          }
        } catch (err) {
          console.error('[가입 승인] 이메일 발송 오류:', err)
          // 이메일 발송 실패해도 승인은 성공으로 처리
        }
      } else {
        console.warn('[가입 승인] 멤버 이메일을 찾을 수 없어 이메일을 발송하지 않았습니다.')
      }

      fetchPendingRequests()
      alert('멤버를 승인했습니다.')
    } catch (error: any) {
      console.error('승인 오류:', error)
      alert(error.message || '승인에 실패했습니다.')
    }
  }

  const handleRejectMember = async (memberId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('cop_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        throw error
      }

      fetchPendingRequests()
      alert('가입 요청을 거부했습니다.')
    } catch (error: any) {
      console.error('거부 오류:', error)
      alert(error.message || '거부에 실패했습니다.')
    }
  }

  const displayName = (member: CopMember) => {
    return member.user?.nickname || member.user?.name || '익명'
  }

  useEffect(() => {
    if (!mounted || authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // 권한 확인
    const isOwner = user.id === cop.user_id
    if (isOwner) {
      return // 소유자는 바로 통과
    }

    // 관리자 체크
    const checkAdmin = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle()

        const adminCheck = profile?.email === ADMIN_EMAIL
        setIsAdmin(adminCheck)

        if (!adminCheck) {
          router.push(`/cop/${cop.id}`)
        }
      } catch (error) {
        console.error('관리자 확인 오류:', error)
        setIsAdmin(false)
        router.push(`/cop/${cop.id}`)
      }
    }

    checkAdmin()
  }, [user, authLoading, router, mounted, cop, supabase])

  // 권한이 확인된 후 가입 요청 조회
  useEffect(() => {
    if (!mounted || authLoading || !user) return
    
    const isOwner = user.id === cop.user_id
    const hasPermission = isOwner || isAdmin
    
    if (hasPermission) {
      fetchPendingRequests()
    }
  }, [mounted, authLoading, user, isAdmin, cop.id, supabase])

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isOwner = user.id === cop.user_id
  const hasPermission = isOwner || isAdmin
  if (!hasPermission) {
    return null
  }

  const handleDelete = async () => {
    if (!user || (!isOwner && !isAdmin)) {
      alert('권한이 없습니다.')
      return
    }

    if (!confirm('정말 이 CoP를 삭제하시겠습니까? 삭제된 CoP는 복구할 수 없습니다.')) return

    setDeleting(true)

    try {
      // 먼저 관련된 멤버 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
      await supabase
        .from('cop_members')
        .delete()
        .eq('cop_id', cop.id)

      // CoP 삭제
      const { error } = await supabase
        .from('cops')
        .delete()
        .eq('id', cop.id)

      if (error) {
        throw error
      }

      alert('CoP가 삭제되었습니다.')
      router.push('/dashboard?tab=study')
      router.refresh()
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(error.message || '삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSuccess = () => {
    router.push(`/cop/${cop.id}`)
    router.refresh()
  }

  const handleClose = () => {
    router.push(`/cop/${cop.id}`)
  }

  return (
    <div className="space-y-6">
      {/* 가입 요청 관리 */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            가입 요청 ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3 flex-1">
                  {request.user?.avatar_url ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={request.user.avatar_url}
                        alt={displayName(request)}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {displayName(request).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{displayName(request)}</div>
                    {request.user && (request.user.company || request.user.team || request.user.name || request.user.position) && (
                      <div className="text-xs text-gray-500">
                        {[request.user.company, request.user.team, request.user.name, request.user.position].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveMember(request.id)}
                    className="px-4 py-2 bg-ok-primary text-white rounded-lg text-sm font-semibold hover:bg-ok-dark transition-colors"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleRejectMember(request.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                  >
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CopCreateForm
        cop={cop}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
      
      {/* 삭제하기 버튼 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">위험한 작업</h3>
          <p className="text-sm text-red-700 mb-4">
            CoP를 삭제하면 모든 멤버 정보와 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? '삭제 중...' : 'CoP 삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
