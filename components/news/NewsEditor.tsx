'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/post/RichTextEditor'
import ImageUpload from '@/components/post/ImageUpload'
import Image from 'next/image'
import type { News } from '@/lib/types/database'

interface NewsEditorProps {
  onClose: () => void
  onSuccess: () => void
  news?: News
  isModal?: boolean // 모달 모드 여부
}

export default function NewsEditor({ onClose, onSuccess, news: initialNews, isModal = true }: NewsEditorProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const isEditMode = !!initialNews
  const [title, setTitle] = useState(initialNews?.title || '')
  const [content, setContent] = useState(initialNews?.content || '')
  const [sourceUrl, setSourceUrl] = useState(initialNews?.source_url || '')
  const [imageUrl, setImageUrl] = useState<string | null>(initialNews?.image_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showImageSelector, setShowImageSelector] = useState(false)

  // 게시글 내용에서 이미지 URL 추출
  const contentImages = useMemo(() => {
    if (!content || typeof content !== 'string') return []
    
    try {
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
      const urls: string[] = []
      let match
      
      while ((match = imgRegex.exec(content)) !== null) {
        if (match[1]) {
          // HTML 엔티티 디코딩
          let imageUrl = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
          
          // 상대 경로를 절대 경로로 변환
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl
          } else if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
            // 절대 경로는 그대로 유지 (Supabase URL일 수 있음)
          }
          
          // 중복 제거
          if (imageUrl && !urls.includes(imageUrl)) {
            urls.push(imageUrl)
          }
        }
      }
      
      console.log('추출된 이미지 URL:', urls)
      return urls
    } catch (error) {
      console.error('이미지 URL 추출 오류:', error)
      return []
    }
  }, [content])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      if (isEditMode && initialNews) {
        // 뉴스 수정
        const { error: updateError } = await supabase
          .from('news')
          .update({
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl,
            source_url: sourceUrl.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialNews.id)
          .eq('user_id', user.id) // 작성자만 수정 가능

        if (updateError) {
          throw new Error(updateError.message || '뉴스 수정에 실패했습니다.')
        }
      } else {
        // 뉴스 생성
        const { error: insertError } = await supabase
          .from('news')
          .insert({
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl,
            source_url: sourceUrl.trim() || null,
            user_id: user.id,
            is_manual: true,
            published_at: new Date().toISOString(),
          })

        if (insertError) {
          throw new Error(insertError.message || '뉴스 작성에 실패했습니다.')
        }
      }

      onSuccess()
    } catch (err) {
      console.error('뉴스 작성 오류:', err)
      setError(err instanceof Error ? err.message : '뉴스 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const containerClass = isModal 
    ? "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    : "w-full"
  
  const contentClass = isModal
    ? "bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
    : "bg-white rounded-2xl shadow-xl w-full"

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? '뉴스 수정' : '뉴스 작성'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="뉴스 제목을 입력하세요"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
                required
              />
            </div>

            {/* 썸네일 이미지 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                썸네일 이미지 (선택)
              </label>
              
              {/* 현재 선택된 썸네일 미리보기 */}
              {imageUrl && (
                <div className="mb-4">
                  <div className="relative w-32 h-32 bg-gray-200 rounded-lg overflow-hidden border-2 border-ok-primary">
                    {imageUrl.startsWith('http') && !imageUrl.includes('supabase.co') ? (
                      <img
                        src={imageUrl}
                        alt="썸네일 미리보기"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <Image
                        src={imageUrl}
                        alt="썸네일 미리보기"
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* 이미지 업로드 */}
              <div className="mb-4">
                <ImageUpload 
                  onImagesChange={(urls) => setImageUrl(urls.length > 0 ? urls[0] : null)}
                  existingImages={imageUrl ? [imageUrl] : []}
                  maxImages={1}
                />
              </div>

              {/* 게시글 내용의 이미지에서 선택 */}
              {contentImages.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    className="text-sm text-ok-primary hover:text-ok-dark font-medium mb-2"
                  >
                    {showImageSelector ? '▼' : '▶'} 게시글 내용의 이미지에서 선택 ({contentImages.length}개)
                  </button>
                  
                  {showImageSelector && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {contentImages.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          onClick={() => {
                            setImageUrl(url)
                            setShowImageSelector(false)
                          }}
                          className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all bg-gray-100 ${
                            imageUrl === url
                              ? 'border-ok-primary ring-2 ring-ok-primary/20'
                              : 'border-gray-200 hover:border-ok-primary/50'
                          }`}
                        >
                          <div className="relative w-full h-full">
                            <Image
                              src={url}
                              alt={`이미지 ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 33vw, 25vw"
                              unoptimized
                              onError={() => {
                                console.error('이미지 로드 오류:', url)
                              }}
                            />
                          </div>
                          {imageUrl === url && (
                            <div className="absolute inset-0 bg-ok-primary/20 flex items-center justify-center z-10 pointer-events-none">
                              <div className="bg-ok-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                ✓
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 출처 URL (선택) */}
            <div>
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-2">
                출처 URL (선택)
              </label>
              <input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
              />
            </div>

            {/* 내용 */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="뉴스 내용을 입력하세요..."
                  minHeight="400px"
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-ok-primary text-white rounded-xl font-semibold hover:bg-ok-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (isEditMode ? '수정 중...' : '작성 중...') : (isEditMode ? '수정하기' : '작성하기')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
