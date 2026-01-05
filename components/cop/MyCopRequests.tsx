'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import type { CoP } from '@/lib/types/database'

interface MyCopRequestsProps {
  onClose: () => void
}

export default function MyCopRequests({ onClose }: MyCopRequestsProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [myCops, setMyCops] = useState<CoP[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchMyCops()
    }
  }, [user])

  const fetchMyCops = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: copsData, error } = await supabase
        .from('cops')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('내 CoP 조회 오류:', error)
        setMyCops([])
        return
      }

      setMyCops(copsData || [])
    } catch (error) {
      console.error('내 CoP 조회 오류:', error)
      setMyCops([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '승인 대기', color: 'bg-yellow-100 text-yellow-800' }
      case 'approved':
        return { label: '승인됨', color: 'bg-green-100 text-green-800' }
      case 'rejected':
        return { label: '거부됨', color: 'bg-red-100 text-red-800' }
      default:
        return { label: '알 수 없음', color: 'bg-gray-100 text-gray-800' }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">내 CoP 개설 내역</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : myCops.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">개설 신청한 CoP가 없습니다.</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-ok-primary text-white rounded-lg font-semibold hover:bg-ok-dark transition-colors"
              >
                닫기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myCops.map((cop) => {
                const statusInfo = getStatusLabel(cop.status)
                return (
                  <div
                    key={cop.id}
                    className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-ok-primary/50 transition-colors"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 대표 이미지 */}
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {cop.image_url ? (
                            <Image
                              src={cop.image_url}
                              alt={cop.name}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-ok-primary/20 to-ok-light flex items-center justify-center">
                              <span className="text-2xl">💡</span>
                            </div>
                          )}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{cop.name}</h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          
                          {cop.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {cop.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span>멤버 정원: {cop.max_members}명</span>
                            <span>신청일: {new Date(cop.created_at).toLocaleDateString('ko-KR')}</span>
                          </div>

                          {cop.status === 'approved' && (
                            <Link
                              href={`/cop/${cop.id}`}
                              onClick={onClose}
                              className="inline-block px-4 py-2 bg-ok-primary text-white rounded-lg text-sm font-semibold hover:bg-ok-dark transition-colors"
                            >
                              CoP 페이지 보기
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
