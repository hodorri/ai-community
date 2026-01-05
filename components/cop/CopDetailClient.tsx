'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import type { CoP } from '@/lib/types/database'

interface CopDetailClientProps {
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

export default function CopDetailClient({ cop }: CopDetailClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [members, setMembers] = useState<CopMember[]>([])
  const [pendingRequests, setPendingRequests] = useState<CopMember[]>([])
  const [currentMembers, setCurrentMembers] = useState(0)
  const [isMember, setIsMember] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    checkPermissions()
    fetchMembers()
    fetchPendingRequests()
    checkMembership()
  }, [user, cop.id])

  const checkPermissions = async () => {
    if (!user) {
      setIsOwner(false)
      setIsAdmin(false)
      return
    }

    // 개설자 확인
    setIsOwner(user.id === cop.user_id)

    // 관리자 확인
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle()

      setIsAdmin(profile?.email === ADMIN_EMAIL)
    } catch (error) {
      console.error('권한 확인 오류:', error)
      setIsAdmin(false)
    }
  }

  const fetchMembers = async () => {
    try {
      // 승인된 멤버 수만 조회
      const { count } = await supabase
        .from('cop_members')
        .select('*', { count: 'exact', head: true })
        .eq('cop_id', cop.id)
        .eq('status', 'approved')

      setCurrentMembers(count || 0)

      // 승인된 멤버 목록만 조회
      const { data: membersData, error } = await supabase
        .from('cop_members')
        .select('id, user_id, created_at, status')
        .eq('cop_id', cop.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('멤버 조회 오류:', error)
        return
      }

      if (!membersData || membersData.length === 0) {
        setMembers([])
        setLoading(false)
        return
      }

      // 각 멤버의 프로필 정보 조회
      const membersWithProfiles = await Promise.all(
        membersData.map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, nickname, avatar_url, company, team, position')
            .eq('id', member.user_id)
            .maybeSingle()

          return {
            ...member,
            user: profile || null,
          } as CopMember
        })
      )

      setMembers(membersWithProfiles)
    } catch (error) {
      console.error('멤버 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    if (!isOwner && !isAdmin) {
      setPendingRequests([])
      return
    }

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

  const checkMembership = async () => {
    if (!user) {
      setIsMember(false)
      setHasPendingRequest(false)
      return
    }

    try {
      // 승인된 멤버인지 확인
      const { data: approvedMember } = await supabase
        .from('cop_members')
        .select('id')
        .eq('cop_id', cop.id)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()

      setIsMember(!!approvedMember)

      // 가입 요청 대기 중인지 확인
      const { data: pendingRequest } = await supabase
        .from('cop_members')
        .select('id')
        .eq('cop_id', cop.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      setHasPendingRequest(!!pendingRequest)
    } catch (error) {
      console.error('멤버십 확인 오류:', error)
      setIsMember(false)
      setHasPendingRequest(false)
    }
  }

  const handleJoin = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (currentMembers >= cop.max_members) {
      alert('멤버 정원이 가득 찼습니다.')
      return
    }

    if (isMember) {
      alert('이미 가입된 CoP입니다.')
      return
    }

    if (hasPendingRequest) {
      alert('이미 가입 요청이 대기 중입니다.')
      return
    }

    setJoining(true)

    try {
      const { error } = await supabase
        .from('cop_members')
        .insert({
          cop_id: cop.id,
          user_id: user.id,
          status: 'pending', // 가입 요청 상태로 저장
        })

      if (error) {
        throw error
      }

      // 개설자에게 이메일 알림 발송
      try {
        // 현재 사용자 프로필 정보 조회
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, nickname, email')
          .eq('id', user.id)
          .maybeSingle()

        await fetch('/api/notify-cop-owner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            copId: cop.id,
            copName: cop.name,
            requesterName: profile?.nickname || profile?.name || null,
            requesterEmail: user.email || profile?.email || null,
          }),
        })
      } catch (err) {
        console.error('이메일 발송 실패:', err)
        // 이메일 발송 실패해도 가입 요청은 성공으로 처리
      }

      setHasPendingRequest(true)
      if (isOwner || isAdmin) {
        fetchPendingRequests()
      }
      alert('가입 요청이 완료되었습니다. 개설자 승인 후 멤버가 됩니다.')
    } catch (error: any) {
      console.error('가입 요청 오류:', error)
      alert(error.message || '가입 요청에 실패했습니다.')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!user || !isMember) return

    if (!confirm('정말 탈퇴하시겠습니까?')) return

    setLeaving(true)

    try {
      const { error } = await supabase
        .from('cop_members')
        .delete()
        .eq('cop_id', cop.id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setIsMember(false)
      setCurrentMembers(prev => Math.max(0, prev - 1))
      fetchMembers()
    } catch (error: any) {
      console.error('탈퇴 오류:', error)
      alert(error.message || '탈퇴에 실패했습니다.')
    } finally {
      setLeaving(false)
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

      fetchMembers()
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

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!confirm('정말 이 멤버를 탈퇴시키시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('cop_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        throw error
      }

      setCurrentMembers(prev => Math.max(0, prev - 1))
      fetchMembers()
      alert('멤버를 탈퇴시켰습니다.')
    } catch (error: any) {
      console.error('멤버 제거 오류:', error)
      alert(error.message || '멤버 제거에 실패했습니다.')
    }
  }

  const displayName = (member: CopMember) => {
    return member.user?.nickname || member.user?.name || '익명'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎓</span>
          <span className="text-sm font-medium text-gray-700">AI CoP</span>
        </div>
        <div className="w-5" /> {/* 공간 맞춤 */}
      </div>

      {/* 대표 이미지 */}
      {cop.image_url && (
        <div className="relative w-full h-80 mb-8 rounded-xl overflow-hidden bg-gray-200">
          <Image
            src={cop.image_url}
            alt={cop.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      {/* 활동명 */}
      <h1 className="text-3xl font-bold mb-8 text-gray-900">{cop.name}</h1>

      {/* 간단 소개 */}
      {cop.description && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">간단 소개</h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{cop.description}</p>
        </div>
      )}

      {/* 멤버 정보 및 가입 버튼 */}
      <div className="mb-8 pb-8 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">멤버 정원</div>
              <div className="text-2xl font-bold text-gray-900">
                {currentMembers}명 / {cop.max_members}명
              </div>
            </div>
            <div className="h-12 w-px bg-gray-200" />
            <div>
              <div className="text-sm text-gray-600 mb-1">모집 현황</div>
              <div className="text-lg font-semibold text-gray-900">
                {Math.round((currentMembers / cop.max_members) * 100)}% 모집됨
              </div>
            </div>
          </div>
           {user && (
             <div>
               {isOwner || isAdmin ? (
                 <button
                   onClick={() => router.push(`/cop/${cop.id}/edit`)}
                   className="px-6 py-2 bg-ok-primary text-white rounded-lg font-semibold hover:bg-ok-dark transition-colors"
                 >
                   관리하기
                 </button>
               ) : isMember ? (
                 <button
                   onClick={handleLeave}
                   disabled={leaving}
                   className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   {leaving ? '탈퇴 중...' : '탈퇴하기'}
                 </button>
               ) : hasPendingRequest ? (
                 <button
                   disabled
                   className="px-6 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold cursor-not-allowed"
                 >
                   승인 대기 중
                 </button>
               ) : (
                 <button
                   onClick={handleJoin}
                   disabled={joining || currentMembers >= cop.max_members}
                   className="px-6 py-2 bg-ok-primary text-white rounded-lg font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   {joining ? '요청 중...' : currentMembers >= cop.max_members ? '정원 마감' : '가입하기'}
                 </button>
               )}
             </div>
           )}
        </div>
      </div>

      {/* 활동 계획 */}
      {cop.activity_plan && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">활동 계획</h2>
          <div className="bg-gray-50 rounded-xl p-6">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{cop.activity_plan}</p>
          </div>
        </div>
      )}

      {/* 활용 예정 AI Tool */}
      {cop.ai_tools && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">활용 예정 AI Tool</h2>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-gray-700 font-medium">{cop.ai_tools}</p>
          </div>
        </div>
      )}

      {/* 가입 요청 관리 (개설자/관리자만) */}
      {(isOwner || isAdmin) && pendingRequests.length > 0 && (
        <div className="mb-8 pb-8 border-b">
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

      {/* 멤버 목록 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">멤버 목록</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">아직 가입한 멤버가 없습니다.</div>
        ) : (
          <div className="space-y-3">
             {members.map((member) => (
               <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                 <div className="flex items-center gap-3 flex-1">
                   {member.user?.avatar_url ? (
                     <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                       <Image
                         src={member.user.avatar_url}
                         alt={displayName(member)}
                         fill
                         className="object-cover"
                         sizes="40px"
                       />
                     </div>
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                       {displayName(member).charAt(0).toUpperCase()}
                     </div>
                   )}
                   <div className="flex-1 min-w-0">
                     <div className="font-semibold text-gray-900">{displayName(member)}</div>
                     {member.user && (member.user.company || member.user.team || member.user.name || member.user.position) && (
                       <div className="text-xs text-gray-500">
                         {[member.user.company, member.user.team, member.user.name, member.user.position].filter(Boolean).join(' ')}
                       </div>
                     )}
                   </div>
                 </div>
                 {/* 개설자/관리자만 강제 탈퇴 버튼 표시 (본인 제외) */}
                 {(isOwner || isAdmin) && member.user_id !== cop.user_id && (
                   <button
                     onClick={() => handleRemoveMember(member.id, member.user_id)}
                     className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                   >
                     탈퇴시키기
                   </button>
                 )}
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}
