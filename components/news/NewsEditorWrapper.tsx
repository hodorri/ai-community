'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import NewsEditor from './NewsEditor'

export default function NewsEditorWrapper() {
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
  }, [user, authLoading, router, mounted])

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

  const handleSuccess = () => {
    router.push('/dashboard?tab=news')
  }

  const handleClose = () => {
    router.push('/dashboard?tab=news')
  }

  return (
    <NewsEditor
      onClose={handleClose}
      onSuccess={handleSuccess}
      isModal={false}
    />
  )
}
