'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import type { CoP } from '@/lib/types/database'

interface CopWithMembers extends CoP {
  current_members?: number
  owner?: {
    name?: string
    nickname?: string
    avatar_url?: string
    company?: string
    team?: string
  } | null
}

interface CopListProps {
  limit?: number // 최대 표시 개수 (기본값: 무제한)
}

export default function CopList({ limit }: CopListProps = {}) {
  const [cops, setCops] = useState<CopWithMembers[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCops() {
      try {
        const supabase = createClient()
        
        // 승인된 CoP만 조회
        const { data: copsData, error } = await supabase
          .from('cops')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('CoP 조회 오류:', error)
          setCops([])
          setLoading(false)
          return
        }

        if (!copsData || copsData.length === 0) {
          setCops([])
          setLoading(false)
          return
        }

        // 각 CoP의 현재 멤버 수 + 개설자 정보 조회
        const copsWithMembers = await Promise.all(
          copsData.map(async (cop) => {
            const [memberResult, profileResult] = await Promise.all([
              supabase
                .from('cop_members')
                .select('*', { count: 'exact', head: true })
                .eq('cop_id', cop.id),
              supabase
                .from('profiles')
                .select('name, nickname, avatar_url, company, team')
                .eq('id', cop.user_id)
                .single(),
            ])

            return {
              ...cop,
              current_members: memberResult.count || 0,
              owner: profileResult.data || null,
            } as CopWithMembers
          })
        )

        // limit이 설정되어 있으면 개수 제한
        const limitedCops = limit ? copsWithMembers.slice(0, limit) : copsWithMembers
        setCops(limitedCops)
      } catch (error) {
        console.error('CoP 조회 오류:', error)
        setCops([])
      } finally {
        setLoading(false)
      }
    }

    fetchCops()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">로딩 중...</div>
    )
  }

  if (cops.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">아직 개설된 CoP가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cops.map((cop) => (
        <Link
          key={cop.id}
          href={`/cop/${cop.id}`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer block"
        >
          {/* 대표 이미지 */}
          <div className="relative w-full h-48 bg-gray-200">
            {cop.image_url ? (
              <Image
                src={cop.image_url}
                alt={cop.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-ok-primary/20 to-ok-light flex items-center justify-center">
                <span className="text-4xl">💡</span>
              </div>
            )}
          </div>

          {/* 내용 */}
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
              {cop.name}
            </h3>
            {cop.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {cop.description}
              </p>
            )}
            {/* 개설자 정보 */}
            {cop.owner && (
              <div className="flex items-center gap-2 mb-3">
                {cop.owner.avatar_url ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={cop.owner.avatar_url} alt="" fill className="object-cover" sizes="24px" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs flex-shrink-0">
                    {(cop.owner.nickname || cop.owner.name || '?').charAt(0)}
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  개설자: {cop.owner.nickname || cop.owner.name || '알 수 없음'}
                  {cop.owner.company && ` · ${cop.owner.company}`}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1 text-xs text-gray-500">
              <span>모집현황: {cop.current_members || 0}명 / {cop.max_members}명</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
