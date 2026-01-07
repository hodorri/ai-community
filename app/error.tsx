'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">오류 발생</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">문제가 발생했습니다</h2>
        <p className="text-gray-500 mb-8">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-block bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
