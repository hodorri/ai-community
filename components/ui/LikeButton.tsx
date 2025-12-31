'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface LikeButtonProps {
  postId: string
  initialLiked: boolean
  initialCount: number
  onToggle: (liked: boolean, count: number) => void
}

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
  onToggle,
}: LikeButtonProps) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
      })

      if (!response.ok) {
        throw new Error('좋아요 처리에 실패했습니다.')
      }

      const data = await response.json()
      setLiked(data.liked)
      setCount(data.count)
      onToggle(data.liked, data.count)
    } catch (error) {
      console.error('좋아요 오류:', error)
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !user}
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
        liked
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } disabled:opacity-50`}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      <span>좋아요 {count}</span>
    </button>
  )
}
