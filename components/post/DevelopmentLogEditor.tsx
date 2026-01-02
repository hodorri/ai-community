'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from './RichTextEditor'
import ImageUpload from './ImageUpload'
import type { Post } from '@/lib/types/database'

interface DevelopmentLogEditorProps {
  post?: Post
}

const DRAFT_STORAGE_KEY = 'post-draft'

export default function DevelopmentLogEditor({ post }: DevelopmentLogEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(post?.title || '')
  const [content, setContent] = useState(post?.content || '')
  const [imageUrls, setImageUrls] = useState<string[]>(post?.image_urls || [])
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftInfo, setDraftInfo] = useState<{ savedAt: string } | null>(null)
  const [showLoadDraftDialog, setShowLoadDraftDialog] = useState(false)

  // 임시 저장된 데이터 확인
  useEffect(() => {
    if (!post) {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          setHasDraft(true)
          setDraftInfo({ savedAt: draft.savedAt || '' })
        } catch (err) {
          console.error('임시 저장 데이터 확인 실패:', err)
        }
      } else {
        setHasDraft(false)
        setDraftInfo(null)
      }
    }
  }, [post])

  // 임시 저장 함수
  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const draft = {
        title,
        content,
        imageUrls,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      setHasDraft(true)
      setDraftInfo({ savedAt: draft.savedAt })
      setSavingDraft(false)
      // 성공 메시지 표시
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.textContent = '임시 저장되었습니다.'
      document.body.appendChild(successMsg)
      setTimeout(() => {
        successMsg.remove()
      }, 2000)
    } catch (err) {
      console.error('임시 저장 실패:', err)
      setSavingDraft(false)
      alert('임시 저장에 실패했습니다.')
    }
  }

  // 임시 저장 불러오기 함수
  const handleLoadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!savedDraft) {
      alert('불러올 임시 저장 데이터가 없습니다.')
      return
    }

    // 현재 입력 중인 내용이 있으면 확인
    if (title.trim() || content.trim()) {
      if (!confirm('현재 입력 중인 내용이 있습니다. 임시 저장된 내용으로 덮어쓰시겠습니까?')) {
        return
      }
    }

    try {
      const draft = JSON.parse(savedDraft)
      if (draft.title) setTitle(draft.title)
      if (draft.content) setContent(draft.content)
      if (draft.imageUrls) setImageUrls(draft.imageUrls)
      setShowLoadDraftDialog(false)
      
      // 성공 메시지 표시
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.textContent = '임시 저장된 내용을 불러왔습니다.'
      document.body.appendChild(successMsg)
      setTimeout(() => {
        successMsg.remove()
      }, 2000)
    } catch (err) {
      console.error('임시 저장 데이터 불러오기 실패:', err)
      alert('임시 저장 데이터를 불러오는데 실패했습니다.')
    }
  }

  // 임시 저장 삭제 함수
  const handleDeleteDraft = () => {
    if (confirm('임시 저장된 내용을 삭제하시겠습니까?')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasDraft(false)
      setDraftInfo(null)
      setShowLoadDraftDialog(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
      const supabase = createClient()
      
      // 현재 사용자 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.')
      }

      if (post) {
        // 수정 모드
        const { data: updatedPost, error } = await supabase
          .from('posts')
          .update({
            title,
            content,
            image_urls: imageUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id)
          .eq('user_id', user.id) // 소유자 확인
          .select()
          .single()

        if (error) {
          console.error('게시글 수정 실패:', error)
          throw new Error(error.message || '게시글 수정에 실패했습니다.')
        }

        if (!updatedPost) {
          throw new Error('게시글을 찾을 수 없거나 권한이 없습니다.')
        }

        router.push(`/post/${updatedPost.id}`)
        router.refresh()
      } else {
        // 생성 모드
        const { data: newPost, error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            title,
            content,
            image_urls: imageUrls,
          })
          .select()
          .single()

        if (error) {
          console.error('게시글 작성 실패:', error)
          throw new Error(error.message || '게시글 작성에 실패했습니다.')
        }

        if (!newPost) {
          throw new Error('게시글이 생성되지 않았습니다.')
        }

        // 게시글 저장 성공 시 임시 저장 데이터 삭제
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        
        // 성공 메시지 표시
        console.log('게시글 작성 성공:', newPost)
        
        // 게시글 상세 페이지로 이동
        router.push(`/post/${newPost.id}`)
        router.refresh()
        
        // 대시보드도 새로고침 (다른 탭에서 열려있을 수 있음)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('post-created'))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 임시 저장 알림 및 불러오기 */}
      {!post && hasDraft && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-900">임시 저장된 내용이 있습니다</p>
              {draftInfo?.savedAt && (
                <p className="text-xs text-blue-600">
                  저장 시간: {new Date(draftInfo.savedAt).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLoadDraftDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
          >
            불러오기
          </button>
        </div>
      )}

      {/* 제목 */}
      <div>
        <label htmlFor="title" className="block text-lg font-bold text-gray-900 mb-2">
          제목
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors text-lg"
          placeholder="게시글 제목을 입력하세요"
        />
      </div>

      {/* GPTs 연결 버튼 */}
      <div className="flex items-center gap-4 py-4">
        <a
          href="https://chatgpt.com/g/g-67e27ac185e881918a2d7b5c437d7de1-gaebaljafyi-sarye-gesigeul-mandeulgi"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-ok-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          사례게시글 GPTs
        </a>
        <span className="text-gray-600 text-sm">
          사례 게시글 작성 시간 5분 컷! GPT로 게시글 작성해요 ✍️
        </span>
      </div>

      {/* 본문 내용 */}
      <div>
        <label className="block text-lg font-bold text-gray-900 mb-2">
          내용
        </label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="게시글 내용을 입력하세요. 툴바의 이미지 버튼으로 이미지를 삽입할 수 있습니다."
          minHeight="400px"
        />
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
        >
          취소
        </button>
        {!post && (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || loading}
            className="px-6 py-3 border-2 border-ok-primary text-ok-primary rounded-xl hover:bg-ok-primary/10 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {savingDraft ? '저장 중...' : '임시 저장하기'}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-ok-primary text-white rounded-xl hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-md hover:shadow-lg"
        >
          {loading ? '저장 중...' : post ? '수정하기' : '작성하기'}
        </button>
      </div>

      {/* 임시 저장 불러오기 다이얼로그 */}
      {showLoadDraftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">임시 저장 불러오기</h3>
            <div className="space-y-4 mb-6">
              <p className="text-gray-600">
                임시 저장된 내용을 불러오시겠습니까?
              </p>
              {draftInfo?.savedAt && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">저장 시간:</span>{' '}
                    {new Date(draftInfo.savedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
              {(title.trim() || content.trim()) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 현재 입력 중인 내용이 있습니다. 불러오면 덮어쓰게 됩니다.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLoadDraftDialog(false)}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteDraft}
                className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-semibold transition-colors"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={handleLoadDraft}
                className="px-4 py-2 bg-ok-primary text-white rounded-xl hover:bg-ok-dark font-semibold transition-colors shadow-md"
              >
                불러오기
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
