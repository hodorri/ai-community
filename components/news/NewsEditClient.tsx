'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import NewsEditor from './NewsEditor'
import type { News } from '@/lib/types/database'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

interface NewsEditClientProps {
  news: News
  isFromSelectedNews?: boolean
}

export default function NewsEditClient({ news, isFromSelectedNews = false }: NewsEditClientProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // 작성자이거나 관리자인 경우 수정 가능
    const isOwner = news.user_id === user.id
    const isAdmin = user.email === ADMIN_EMAIL
    // selected_news에서 온 뉴스는 관리자만 수정 가능
    const canEdit = isOwner || (isAdmin && (isFromSelectedNews || !news.is_manual))

    if (!canEdit) {
      router.push(`/news/${news.id}`)
      return
    }

    setIsAuthorized(true)
  }, [user, authLoading, news.user_id, news.is_manual, news.id, router, isFromSelectedNews])

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <NewsEditor
      news={news}
      isFromSelectedNews={isFromSelectedNews}
      onClose={() => router.push(`/news/${news.id}`)}
      onSuccess={() => router.push(`/news/${news.id}`)}
    />
  )
}
