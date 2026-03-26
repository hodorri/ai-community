'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import NoticeEditor from '@/components/notice/NoticeEditor'
import type { Notice } from '@/lib/types/database'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function EditNoticePage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (user.email !== ADMIN_EMAIL) {
      alert('관리자만 공지사항을 수정할 수 있습니다.')
      router.push('/dashboard?tab=notice')
      return
    }

    async function fetchNotice() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        alert('공지사항을 찾을 수 없습니다.')
        router.push('/dashboard?tab=notice')
        return
      }

      setNotice(data)
      setLoading(false)
    }

    fetchNotice()
  }, [user, authLoading, params.id, router])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!notice) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NoticeEditor notice={notice} />
    </div>
  )
}
