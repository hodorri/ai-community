'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import Image from 'next/image'
import type { CoP } from '@/lib/types/database'

interface CopCreateFormProps {
  onClose: () => void
  onSuccess: () => void
  cop?: CoP // 수정 모드일 때 기존 CoP 데이터
}

export default function CopCreateForm({ onClose, onSuccess, cop }: CopCreateFormProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const supabase = createClient()
  const isEditMode = !!cop
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
  const [name, setName] = useState(cop?.name || '')
  const [description, setDescription] = useState(cop?.description || '')
  const [maxMembers, setMaxMembers] = useState(cop?.max_members || 10)
  const [activityPlan, setActivityPlan] = useState(cop?.activity_plan || '')
  const [aiTools, setAiTools] = useState(cop?.ai_tools || '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(cop?.image_url || null)

  useEffect(() => {
    if (cop) {
      setName(cop.name || '')
      setDescription(cop.description || '')
      setMaxMembers(cop.max_members || 10)
      setActivityPlan(cop.activity_plan || '')
      setAiTools(cop.ai_tools || '')
      setImagePreview(cop.image_url || null)
    }
  }, [cop])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('CoP 활동명을 입력해주세요.')
      return
    }

    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      let imageUrl: string | null = null

      // 이미지 업로드
      if (imageFile) {
        // 파일 크기 제한 (5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('파일 크기는 5MB 이하여야 합니다.')
        }

        // 파일 타입 검증
        if (!imageFile.type.startsWith('image/')) {
          throw new Error('이미지 파일만 업로드 가능합니다.')
        }

        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        // cop-images 버킷이 없으면 post-images 버킷 사용 (임시)
        let bucketName = 'cop-images'
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          })

        // cop-images 버킷이 없으면 post-images 버킷으로 재시도
        if (uploadError && uploadError.message?.includes('Bucket not found')) {
          console.warn('cop-images 버킷이 없습니다. post-images 버킷을 사용합니다.')
          bucketName = 'post-images'
          const retryResult = await supabase.storage
            .from(bucketName)
            .upload(fileName, imageFile, {
              contentType: imageFile.type,
              upsert: false,
            })
          
          if (retryResult.error) {
            console.error('Storage upload error:', retryResult.error)
            throw new Error(`이미지 업로드에 실패했습니다: ${retryResult.error.message || '알 수 없는 오류'}`)
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(retryResult.data.path)
          
          imageUrl = publicUrl
        } else if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(`이미지 업로드에 실패했습니다: ${uploadError.message || '알 수 없는 오류'}`)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uploadData.path)
          
          imageUrl = publicUrl
        }
      }

      if (isEditMode && cop) {
        // CoP 수정
        const { error: copError } = await supabase
          .from('cops')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            image_url: imageUrl || cop.image_url,
            max_members: maxMembers,
            activity_plan: activityPlan.trim() || null,
            ai_tools: aiTools.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cop.id)

        if (copError) {
          throw new Error(copError.message || 'CoP 수정에 실패했습니다.')
        }

        // 성공 메시지 표시
        setShowSuccessMessage(true)
        
        // 1초 후 페이지 이동
        setTimeout(() => {
          onSuccess()
        }, 1000)
      } else {
        // CoP 생성
        const { error: copError } = await supabase
          .from('cops')
          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description.trim() || null,
            image_url: imageUrl,
            max_members: maxMembers,
            activity_plan: activityPlan.trim() || null,
            ai_tools: aiTools.trim() || null,
            status: 'pending',
          })

        if (copError) {
          throw new Error(copError.message || 'CoP 생성에 실패했습니다.')
        }

        // 관리자에게 이메일 알림 발송
        try {
          await fetch('/api/notify-admin-cop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              copName: name.trim(),
              userName: profile?.name || profile?.nickname || null,
              userEmail: user.email || null,
            }),
          })
        } catch (err) {
          console.error('관리자 알림 발송 실패:', err)
          // 이메일 발송 실패해도 CoP 생성은 성공으로 처리
        }

        // 성공 메시지 표시
        setShowSuccessMessage(true)
        
        // 3초 후 모달 닫기
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 수정 모드일 때는 일반 페이지 형태로 표시
  if (isEditMode) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CoP 수정하기</h1>
          <p className="text-gray-600">CoP 정보를 수정할 수 있습니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 대표 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              대표 이미지
            </label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="미리보기"
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">이미지 없음</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-ok-primary file:text-white hover:file:bg-ok-dark"
                />
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF 파일만 업로드 가능합니다.</p>
              </div>
            </div>
          </div>

          {/* CoP 활동명 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              CoP 활동명 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
              placeholder="예: AI 개발자 모임"
            />
          </div>

          {/* 간단 소개 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              간단 소개
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
              placeholder="CoP에 대한 간단한 소개를 입력해주세요."
            />
          </div>

          {/* 멤버 정원 수 */}
          <div>
            <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700 mb-2">
              멤버 정원 수 <span className="text-red-500">*</span>
            </label>
            <input
              id="maxMembers"
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value) || 0)}
              required
              min="1"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
            />
          </div>

          {/* 활동 계획 */}
          <div>
            <label htmlFor="activityPlan" className="block text-sm font-medium text-gray-700 mb-2">
              활동 계획
            </label>
            <textarea
              id="activityPlan"
              value={activityPlan}
              onChange={(e) => setActivityPlan(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
              placeholder="CoP의 활동 계획을 입력해주세요."
            />
          </div>

          {/* 활용 예정 AI Tool */}
          <div>
            <label htmlFor="aiTools" className="block text-sm font-medium text-gray-700 mb-2">
              활용 예정 AI Tool
            </label>
            <input
              id="aiTools"
              type="text"
              value={aiTools}
              onChange={(e) => setAiTools(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
              placeholder="예: ChatGPT, Claude, Midjourney, Runway 등"
            />
            <p className="text-xs text-gray-500 mt-1">활동에 활용할 AI 도구를 입력해주세요.</p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {showSuccessMessage && (
            <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl">
              <p className="font-semibold mb-1">CoP 수정이 완료되었습니다!</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || showSuccessMessage}
              className="px-6 py-3 bg-ok-primary text-white rounded-xl font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? '수정 중...' : showSuccessMessage ? '수정 완료' : '수정하기'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">CoP 개설하기</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 대표 이미지 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대표 이미지
              </label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={imagePreview}
                      alt="미리보기"
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">이미지 없음</span>
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-ok-primary file:text-white hover:file:bg-ok-dark"
                  />
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF 파일만 업로드 가능합니다.</p>
                </div>
              </div>
            </div>

            {/* CoP 활동명 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                CoP 활동명 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                placeholder="예: AI 개발자 모임"
              />
            </div>

            {/* 간단 소개 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                간단 소개
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                placeholder="CoP에 대한 간단한 소개를 입력해주세요."
              />
            </div>

            {/* 멤버 정원 수 */}
            <div>
              <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700 mb-2">
                멤버 정원 수 <span className="text-red-500">*</span>
              </label>
              <input
                id="maxMembers"
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value) || 0)}
                required
                min="1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
              />
            </div>

            {/* 활동 계획 */}
            <div>
              <label htmlFor="activityPlan" className="block text-sm font-medium text-gray-700 mb-2">
                활동 계획
              </label>
              <textarea
                id="activityPlan"
                value={activityPlan}
                onChange={(e) => setActivityPlan(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                placeholder="CoP의 활동 계획을 입력해주세요."
              />
            </div>

            {/* 활용 예정 AI Tool */}
            <div>
              <label htmlFor="aiTools" className="block text-sm font-medium text-gray-700 mb-2">
                활용 예정 AI Tool
              </label>
              <input
                id="aiTools"
                type="text"
                value={aiTools}
                onChange={(e) => setAiTools(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                placeholder="예: ChatGPT, Claude, Midjourney, Runway 등"
              />
              <p className="text-xs text-gray-500 mt-1">활동에 활용할 AI 도구를 입력해주세요.</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {showSuccessMessage && (
              <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl">
                <p className="font-semibold mb-1">CoP 개설 요청이 완료되었습니다!</p>
                <p className="text-sm">관리자 승인 후 활동이 가능합니다. 승인 완료 시 알림을 드리겠습니다.</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || showSuccessMessage}
                className="flex-1 px-6 py-3 bg-ok-primary text-white rounded-xl font-semibold hover:bg-ok-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '제출 중...' : showSuccessMessage ? '제출 완료' : '제출하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
