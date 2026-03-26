'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_BADGES } from '@/lib/badges'
import Image from 'next/image'

interface UserBadgesProps {
  userId: string
  size?: number
}

export default function UserBadges({ userId, size = 20 }: UserBadgesProps) {
  const [badgeData, setBadgeData] = useState<{ id: string; name: string; image: string }[]>([])

  useEffect(() => {
    async function fetchBadges() {
      const supabase = createClient()

      // 유저의 뱃지 ID 조회
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)

      if (!userBadges || userBadges.length === 0) return

      const badgeIds = userBadges.map((b: any) => b.badge_id)

      // DB에서 뱃지 정의 조회
      const { data: definitions } = await supabase
        .from('badge_definitions')
        .select('id, name, image_path')
        .in('id', badgeIds)

      if (definitions && definitions.length > 0) {
        setBadgeData(definitions.map((d: any) => ({ id: d.id, name: d.name, image: d.image_path })))
      } else {
        // fallback to defaults
        setBadgeData(
          badgeIds
            .map((bid: string) => DEFAULT_BADGES.find(b => b.id === bid))
            .filter(Boolean) as { id: string; name: string; image: string }[]
        )
      }
    }
    if (userId) fetchBadges()
  }, [userId])

  if (badgeData.length === 0) return null

  return (
    <span className="inline-flex gap-0.5 ml-1">
      {badgeData.map(b => (
        <Image
          key={b.id}
          src={b.image}
          alt={b.name}
          width={size}
          height={size}
          className="object-contain inline-block"
          title={b.name}
        />
      ))}
    </span>
  )
}
