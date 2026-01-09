'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Greeting } from '@/lib/types/database'
import GreetingItem from './GreetingItem'

interface GreetingListProps {
  limit?: number
}

export default function GreetingList({ limit }: GreetingListProps) {
  const [greetings, setGreetings] = useState<Greeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchGreetings()
    
    // 가입인사 게시물이 작성되었을 때 새로고침
    const handleGreetingPosted = () => {
      fetchGreetings()
    }
    
    window.addEventListener('greeting-posted', handleGreetingPosted)
    
    return () => {
      window.removeEventListener('greeting-posted', handleGreetingPosted)
    }
  }, [])

  const fetchGreetings = async () => {
    try {
      setLoading(true)
      setError(null)

      // greetings 테이블에서 조회 (profiles는 별도로 조회)
      let query = supabase
        .from('greetings')
        .select('*')
        .order('created_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('가입인사 조회 오류:', fetchError)
        throw new Error(fetchError.message || '가입인사를 불러오는데 실패했습니다.')
      }

      if (!data || data.length === 0) {
        setGreetings([])
        setLoading(false)
        return
      }

      // 각 가입인사의 프로필 정보, 좋아요 수, 댓글 수 조회
      const greetingsWithCounts = await Promise.all(
        data.map(async (greeting: any) => {
          const [profileResult, likesResult, commentsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('email, name, nickname, avatar_url, company, team, position')
              .eq('id', greeting.user_id)
              .maybeSingle(),
            supabase
              .from('greeting_likes')
              .select('*', { count: 'exact', head: true })
              .eq('greeting_id', greeting.id),
            supabase
              .from('greeting_comments')
              .select('*', { count: 'exact', head: true })
              .eq('greeting_id', greeting.id),
          ])

          return {
            ...greeting,
            user: profileResult.data || null,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          }
        })
      )

      setGreetings(greetingsWithCounts)
    } catch (err) {
      console.error('가입인사 조회 예외:', err)
      setError(err instanceof Error ? err.message : '가입인사를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
            <p className="text-red-700 font-semibold mb-2">오류가 발생했습니다</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (greetings.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">아직 가입인사가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">첫 번째 가입인사를 남겨보세요!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {greetings.map((greeting) => (
        <GreetingItem 
          key={greeting.id} 
          greeting={greeting} 
          onUpdate={fetchGreetings}
        />
      ))}
    </div>
  )
}
