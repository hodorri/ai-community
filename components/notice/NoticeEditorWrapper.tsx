'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import NoticeEditor from './NoticeEditor'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function NoticeEditorWrapper() {
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

    if (user.email !== ADMIN_EMAIL) {
      alert('관리자만 공지사항을 작성할 수 있습니다.')
      router.push('/dashboard?tab=notice')
      return
    }
  }, [user, authLoading, router, mounted])

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null
  }

  return <NoticeEditor />
}
