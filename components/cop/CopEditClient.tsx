'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { CoP } from '@/lib/types/database'
import CopCreateForm from './CopCreateForm'

interface CopEditClientProps {
  cop: CoP
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function CopEditClient({ cop }: CopEditClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwner = user?.id === cop.user_id
  const isAdmin = user?.email === ADMIN_EMAIL

  const handleDelete = async () => {
    if (!user || (!isOwner && !isAdmin)) return

    if (!confirm('정말 이 CoP를 삭제하시겠습니까? 삭제된 CoP는 복구할 수 없습니다.')) return

    setDeleting(true)

    try {
      // 먼저 관련된 멤버 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
      await supabase
        .from('cop_members')
        .delete()
        .eq('cop_id', cop.id)

      // CoP 삭제
      const { error } = await supabase
        .from('cops')
        .delete()
        .eq('id', cop.id)

      if (error) {
        throw error
      }

      alert('CoP가 삭제되었습니다.')
      router.push('/dashboard?tab=study')
      router.refresh()
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(error.message || '삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSuccess = () => {
    router.push(`/cop/${cop.id}`)
    router.refresh()
  }

  const handleClose = () => {
    router.push(`/cop/${cop.id}`)
  }

  return (
    <div className="space-y-6">
      <CopCreateForm
        cop={cop}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
      
      {/* 삭제하기 버튼 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">위험한 작업</h3>
          <p className="text-sm text-red-700 mb-4">
            CoP를 삭제하면 모든 멤버 정보와 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? '삭제 중...' : 'CoP 삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
