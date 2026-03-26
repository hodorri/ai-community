'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DevelopmentLogEditor from './DevelopmentLogEditor'
import type { Post } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

interface EditPostClientProps {
  post: Post
}

export default function EditPostClient({ post }: EditPostClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.email === ADMIN_EMAIL && ADMIN_EMAIL !== '') {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [user])

  useEffect(() => {
    if (!mounted || authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // 게시글 소유자 확인 (관리자는 통과)
    if (post.user_id !== user.id && !isAdmin) {
      router.push(`/post/${post.id}`)
      return
    }
  }, [user, authLoading, router, mounted, post, isAdmin])

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

  if (post.user_id !== user.id && !isAdmin) {
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
