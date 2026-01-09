'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface CaseDetailProps {
  case: any
  currentUserId?: string | null
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 30) return `${diffDays}일 전`
  
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}개월 전`
  
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}년 전`
}

function isImageUrl(url?: string | null): boolean {
  if (!url) return false
  const lowered = url.toLowerCase()
  return (
    lowered.endsWith('.png') ||
    lowered.endsWith('.jpg') ||
    lowered.endsWith('.jpeg') ||
    lowered.endsWith('.gif') ||
    lowered.endsWith('.webp') ||
    lowered.includes('format=jpg') ||
    lowered.includes('format=png') ||
    lowered.includes('format=webp')
  )
}

export default function CaseDetail({ case: caseData, currentUserId }: CaseDetailProps) {
  const [isPinned, setIsPinned] = useState(caseData.is_pinned || false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [engineerData, setEngineerData] = useState<any>(null)
  const [loadingEngineer, setLoadingEngineer] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = currentUserEmail === ADMIN_EMAIL

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserEmail(user?.email || null)
    }
    
    fetchCurrentUser()
  }, [supabase])

  // 좋아요 상태 및 개수 조회
  useEffect(() => {
    async function fetchLikes() {
      // 좋아요 개수 조회
      const { count } = await supabase
        .from('case_likes')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseData.id)
      
      setLikesCount(count || 0)

      // 현재 사용자 좋아요 여부 확인
      if (currentUserId) {
        const { data: likeData } = await supabase
          .from('case_likes')
          .select('id')
          .eq('case_id', caseData.id)
          .eq('user_id', currentUserId)
          .maybeSingle()
        
        setIsLiked(!!likeData)
      }
    }

    fetchLikes()
  }, [caseData.id, currentUserId, supabase])

  // AI Engineer 데이터 조회
  useEffect(() => {
    async function fetchEngineerData() {
      const employeeNumber = caseData.employee_number
      if (!employeeNumber) return

      setLoadingEngineer(true)
      try {
        const { data, error } = await supabase
          .from('first_engineer')
          .select('*')
          .eq('employee_id', employeeNumber)
          .maybeSingle()

        if (error) {
          console.error('Error fetching engineer data:', error)
        } else if (data) {
          setEngineerData(data)
        }
      } catch (err) {
        console.error('Error fetching engineer data:', err)
      } finally {
        setLoadingEngineer(false)
      }
    }

    fetchEngineerData()
  }, [caseData.employee_number, supabase])

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }

    try {
      const { data: existingLike } = await supabase
        .from('case_likes')
        .select('id')
        .eq('case_id', caseData.id)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (existingLike) {
        // 좋아요 취소
        await supabase
          .from('case_likes')
          .delete()
          .eq('id', existingLike.id)
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        await supabase
          .from('case_likes')
          .insert({
            case_id: caseData.id,
            user_id: currentUserId,
          })
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error)
      alert('좋아요 처리에 실패했습니다.')
    }
  }

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleTogglePin = async () => {
    if (!isAdmin) return

    try {
      const { error } = await supabase
        .from('ai_cases')
        .update({ is_pinned: !isPinned })
        .eq('id', caseData.id)

      if (error) {
        throw error
      }

      setIsPinned(!isPinned)
      setShowMenu(false)
      
      // 목록 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('cases-updated'))
      
      router.refresh()
    } catch (error) {
      console.error('고정 상태 변경 오류:', error)
      alert(`고정 상태 변경에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    
    if (!confirm('정말로 이 활용사례를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
      return
    }

    try {
      // AI 개발일지와 동일한 방식: 클라이언트에서 직접 삭제
      const { error } = await supabase
        .from('ai_cases')
        .delete()
        .eq('id', caseData.id)

      if (error) {
        console.error('[AI 활용사례 삭제] 삭제 오류:', error)
        throw error
      }

      alert('활용사례가 삭제되었습니다.')
      setShowMenu(false)
      
      // 목록 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('cases-updated'))
      
      // 목록 페이지로 이동
      router.push('/cases')
      router.refresh()
    } catch (error: any) {
      console.error('[AI 활용사례 삭제] 삭제 오류:', error)
      alert(`삭제에 실패했습니다: ${error?.message || '알 수 없는 오류'}`)
    }
  }

  const authorName = caseData.user?.name || caseData.user?.nickname || caseData.author_name || '익명'
  const authorInitial = authorName.charAt(0).toUpperCase()
  const timeAgo = caseData.published_at 
    ? getTimeAgo(caseData.published_at)
    : getTimeAgo(caseData.created_at)

  return (
    <div className="p-6 sm:p-8">
      {/* 헤더 - 목록으로 돌아가기, 카테고리, 고정 버튼 및 메뉴 */}
      <div className="relative flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/cases')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">목록으로</span>
        </button>
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          {isPinned && (
            <span className="text-yellow-500 text-lg" title="고정된 게시물">📌</span>
          )}
          <span className="text-sm text-gray-600">💡 AI 활용사례</span>
        </div>
        {isAdmin ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={handleTogglePin}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                >
                  {isPinned ? '고정 해제' : '상단 고정'}
                </button>
                <button
                  onClick={() => router.push(`/cases/${caseData.id}/edit`)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  수정하기
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                >
                  삭제하기
                </button>
              </div>
            )}
          </div>
        ) : (
          <div></div>
        )}
      </div>

      <div>
        {/* AI Engineer Profile */}
        {engineerData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h1 className="text-xl font-bold mb-6 text-ok-primary leading-tight">AI Engineer Profile</h1>
            <div className="flex items-center gap-6">
              {/* 좌측 이미지 */}
              <div className="flex-shrink-0">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                  <Image
                    src="/engineer.png"
                    alt={engineerData.name || 'Engineer'}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              </div>
              
              {/* 우측 정보 */}
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  {[
                    engineerData.company && engineerData.final_department 
                      ? `${engineerData.company} ${engineerData.final_department}`
                      : engineerData.final_department || engineerData.company,
                    engineerData.name,
                    engineerData.title
                  ].filter(Boolean).join(' ')}
                </div>
                {isAdmin && (
                  <>
                    <div className="text-xs text-gray-500">
                      AI Engineer: {engineerData.evaluation_result || '-'}
                    </div>
                    {engineerData.training_company && engineerData.training_department && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        교육 당시: {engineerData.training_company} {engineerData.training_department}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 작성자 정보 (fallback) */
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold">
              {authorInitial}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{authorName}</div>
              {caseData.employee_number && (
                <div className="text-xs text-gray-500 mt-0.5">
                  사원번호: {caseData.employee_number}
                </div>
              )}
              {caseData.ai_engineer_cohort && (
                <div className="text-xs text-gray-500 mt-0.5">
                  AI Engineer {caseData.ai_engineer_cohort}
                </div>
              )}
            </div>
          </div>
        )}

      {/* 리딩역할 및 AI활용수준 - 관리자만 표시 */}
      {isAdmin && (
        <div className="space-y-4 mb-6">
          {caseData.leading_role && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">리딩역할</h3>
              <p className="text-gray-600">{caseData.leading_role}</p>
            </div>
          )}

          {caseData.ai_usage_level && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">AI활용수준</h3>
              {(() => {
                const level = caseData.ai_usage_level.toLowerCase().trim()
                let bgColor = 'bg-blue-100'
                let borderColor = 'border-blue-300'
                let textColor = 'text-blue-700'
                
                if (level.includes('중급') || level === '중급') {
                  bgColor = 'bg-orange-100'
                  borderColor = 'border-orange-300'
                  textColor = 'text-orange-700'
                } else if (level.includes('고급') || level === '고급') {
                  bgColor = 'bg-pink-100'
                  borderColor = 'border-pink-300'
                  textColor = 'text-pink-700'
                } else if (level.includes('기초') || level === '기초') {
                  bgColor = 'bg-blue-100'
                  borderColor = 'border-blue-300'
                  textColor = 'text-blue-700'
                }
                
                return (
                  <span className={`inline-block px-4 py-1.5 rounded-lg border-2 ${bgColor} ${borderColor} ${textColor} font-semibold text-sm`}>
                    {caseData.ai_usage_level}
                  </span>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* 역할 수행 내용 - 관리자만 표시 */}
      {isAdmin && caseData.activity_details && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">역할 수행 내용</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{caseData.activity_details}</p>
        </div>
      )}

      {/* 본문 내용 - 관리자만 표시 */}
      {isAdmin && (
        <div className="prose prose-lg max-w-none mb-10">
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {caseData.content || '내용이 없습니다.'}
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div className="border-t border-gray-200 my-10"></div>

      {/* 추가 정보 섹션 */}
      <div className="space-y-6 mb-10">

        {caseData.output_name && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">산출물명</h3>
            <p className="text-gray-600">{caseData.output_name}</p>
          </div>
        )}

        {caseData.development_background && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">개발배경</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{caseData.development_background}</p>
          </div>
        )}

        {caseData.features && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">기능</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{caseData.features}</p>
          </div>
        )}

        {caseData.usage_effects && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">사용효과</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{caseData.usage_effects}</p>
          </div>
        )}

        {caseData.ai_tools && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">사용 AI 도구</h3>
            <p className="text-gray-600">{caseData.ai_tools}</p>
          </div>
        )}

        {caseData.attached_file_name && 
         caseData.attached_file_name.trim() !== '-' && 
         caseData.attached_file_name.trim() !== '(-)' &&
         caseData.attached_file_name.trim() !== '- (-)' &&
         !(caseData.attached_file_name.trim() === '-' && (!caseData.attached_file_size || caseData.attached_file_size.trim() === '-' || caseData.attached_file_size.trim() === '(-)')) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">첨부파일</h3>
            <p className="text-gray-600">
              {caseData.attached_file_name}
              {caseData.attached_file_size && caseData.attached_file_size.trim() !== '-' && caseData.attached_file_size.trim() !== '(-)' && ` (${caseData.attached_file_size})`}
            </p>
          </div>
        )}

        {(caseData.attached_file_url || caseData.attached_file_name) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">첨부 링크/이미지</h3>
            {caseData.attached_file_url ? (
              <div className="space-y-3">
                <a
                  href={caseData.attached_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ok-primary hover:text-ok-dark text-sm underline break-all"
                >
                  {caseData.attached_file_url}
                </a>

                {isImageUrl(caseData.attached_file_url) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    {/* 외부 도메인도 안전하게 보여주기 위해 img 사용 */}
                    <img
                      src={caseData.attached_file_url}
                      alt={caseData.attached_file_name || '첨부 이미지'}
                      className="max-w-full rounded-lg border border-gray-200"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">첨부 URL이 없습니다.</p>
            )}
          </div>
        )}

        {/* 좋아요 수 및 버튼 */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-700 font-medium">{likesCount}</span>
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              isLiked
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-medium text-sm">좋아요</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}
