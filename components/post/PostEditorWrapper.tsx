'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DevelopmentLogEditor from './DevelopmentLogEditor'

export default function PostEditorWrapper() {
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

  try {
    return <DevelopmentLogEditor />
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
