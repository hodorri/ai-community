'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import NewsEditor from './NewsEditor'
import type { News } from '@/lib/types/database'

interface NewsEditClientProps {
  news: News
}

export default function NewsEditClient({ news }: NewsEditClientProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (news.user_id !== user.id) {
      router.push(`/news/${news.id}`)
      return
    }

    setIsAuthorized(true)
  }, [user, authLoading, news.user_id, news.id, router])

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
      onClose={() => router.push(`/news/${news.id}`)}
      onSuccess={() => router.push(`/news/${news.id}`)}
    />
  )
}
