'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NoticeDetail from '@/components/notice/NoticeDetail'
import NoticeCommentSection from '@/components/notice/NoticeCommentSection'
import type { Notice } from '@/lib/types/database'

interface NoticePageClientProps {
  noticeId: string
}

export default function NoticePageClient({ noticeId }: NoticePageClientProps) {
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchNotice() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id)

        const { data: noticeData, error } = await supabase
          .from('notices')
          .select('*, user:profiles(email)')
          .eq('id', noticeId)
          .single()

        if (error || !noticeData) {
          setLoading(false)
          return
        }

        // 좋아요 수
        const { count: likesCount } = await supabase
          .from('notice_likes')
          .select('*', { count: 'exact', head: true })
          .eq('notice_id', noticeId)

        // 댓글 수
        const { count: commentsCount } = await supabase
          .from('notice_comments')
          .select('*', { count: 'exact', head: true })
          .eq('notice_id', noticeId)

        // 좋아요 상태
        let liked = false
        if (user) {
          const { data: like } = await supabase
            .from('notice_likes')
            .select('id')
            .eq('notice_id', noticeId)
            .eq('user_id', user.id)
            .maybeSingle()
          liked = !!like
        }

        setNotice({
          ...noticeData,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        })
        setIsLiked(liked)
      } catch (error) {
        console.error('공지사항 로드 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotice()
  }, [noticeId, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-600 font-semibold">공지사항을 찾을 수 없습니다.</div>
        <button
          onClick={() => router.push('/dashboard?tab=notice')}
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
          <NoticeDetail
            notice={notice}
            isLiked={isLiked}
            currentUserId={currentUserId}
          />
          <div className="px-6 sm:px-8 pb-6 border-t">
            <NoticeCommentSection noticeId={noticeId} />
          </div>
        </div>
      </div>
    </div>
  )
}
