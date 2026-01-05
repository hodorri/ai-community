'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = supabaseRef.current

    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mountedRef.current) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
