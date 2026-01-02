'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DevelopmentLogEditor from './DevelopmentLogEditor'
import type { Post } from '@/lib/types/database'

interface EditPostClientProps {
  post: Post
}

export default function EditPostClient({ post }: EditPostClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // 게시글 소유자 확인
    if (post.user_id !== user.id) {
      router.push(`/post/${post.id}`)
      return
    }
  }, [user, authLoading, router, mounted, post])

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

  if (post.user_id !== user.id) {
    return null
  }

  try {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DevelopmentLogEditor post={post} />
      </div>
    )
  } catch (error) {
    console.error('DevelopmentLogEditor 렌더링 오류:', error)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">
          <p className="font-semibold mb-2">오류가 발생했습니다.</p>
          <p className="text-sm">페이지를 새로고침해주세요.</p>
        </div>
      </div>
    )
  }
}
