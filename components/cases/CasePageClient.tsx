'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import CaseDetail from '@/components/cases/CaseDetail'
import CaseCommentSection from '@/components/cases/CaseCommentSection'

interface CasePageClientProps {
  caseId: string
}

export default function CasePageClient({ caseId }: CasePageClientProps) {
  const { user, loading: authLoading } = useAuth()
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchCase() {
      if (!user) return

      try {
        setLoading(true)

        // 현재 사용자 ID 가져오기
        setCurrentUserId(user.id)

        // AI 활용사례 조회
        const { data, error } = await supabase
          .from('ai_cases')
          .select('*')
          .eq('id', caseId)
          .single()

        if (error) {
          console.error('AI 활용사례 조회 오류:', error)
          throw error
        }

        if (!data) {
          throw new Error('AI 활용사례를 찾을 수 없습니다.')
        }

        // 프로필 정보 매핑
        // attached_file_url이 없으면 source_url을 사용
        const attachedFileUrl = data.attached_file_url || data.source_url || null
        
        const caseWithUser = {
          ...data,
          attached_file_url: attachedFileUrl,
          user: {
            email: data.author_email || null,
            name: data.author_name || null,
            nickname: data.author_name || null,
            avatar_url: null,
            company: null,
            team: null,
            position: null,
          },
          likes_count: 0,
          comments_count: 0,
          user_id: data.imported_by || null,
        }

        setCaseData(caseWithUser)
      } catch (error) {
        console.error('AI 활용사례 조회 예외:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchCase()
    }
  }, [caseId, user, router, supabase])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
          <Link
            href="/login"
            className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-ok-dark transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-600 font-semibold">AI 활용사례를 찾을 수 없습니다.</div>
        <button
          onClick={() => router.push('/cases')}
          className="px-4 py-2 bg-ok-primary text-white rounded-lg hover:bg-ok-dark transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <CaseDetail case={caseData} currentUserId={currentUserId} />
          <div className="px-6 sm:px-8 pb-6 border-t">
            <CaseCommentSection caseId={caseId} />
          </div>
        </div>
      </div>
    </div>
  )
}
