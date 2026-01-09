'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import PostListItem from '@/components/post/PostListItem'
import Link from 'next/link'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function CasesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedCases, setUploadedCases] = useState<any[]>([])
  const [selectedUploaded, setSelectedUploaded] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isAdmin = user?.email === ADMIN_EMAIL
  const ITEMS_PER_PAGE = 20

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!isAdmin) {
      alert('관리자만 사용할 수 있습니다.')
      return
    }

    try {
      setUploading(true)

      // 세션 토큰 가져오기
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        return
      }

      // FormData 생성
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ai-cases/upload-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setUploadedCases(result.cases || [])
        // 중복이 아닌 항목만 자동 선택
        const newSelected = new Set<number>()
        result.cases?.forEach((item: any, index: number) => {
          if (!item.isDuplicate) {
            newSelected.add(index)
          }
        })
        setSelectedUploaded(newSelected)
        alert(`엑셀 파일 업로드 완료!\n총 ${result.total}개 사례를 불러왔습니다.`)
      } else {
        throw new Error(result.error || '업로드 실패')
      }
    } catch (error: any) {
      console.error('엑셀 업로드 오류:', error)
      alert('엑셀 업로드 실패: ' + (error?.message || '알 수 없는 오류'))
    } finally {
      setUploading(false)
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 게시글 선택 토글
  const handleTogglePostSelection = (postId: string) => {
    const newSelected = new Set(selectedPosts)
    if (newSelected.has(postId)) {
      newSelected.delete(postId)
    } else {
      newSelected.add(postId)
    }
    setSelectedPosts(newSelected)
  }

  const handleSelectAllPosts = () => {
    const newSelected = new Set<string>()
    posts.forEach(post => {
      newSelected.add(post.id)
    })
    setSelectedPosts(newSelected)
  }

  const handleDeselectAllPosts = () => {
    setSelectedPosts(new Set())
  }

  // 선택된 게시글 삭제
  const handleDeleteSelected = async () => {
    if (selectedPosts.size === 0) {
      alert('삭제할 게시글을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedPosts.size}개 게시글을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) {
      return
    }

    try {
      setDeleting(true)

      // 세션 토큰 가져오기
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setDeleting(false)
        return
      }

      // 선택된 게시글들을 하나씩 삭제
      const deletePromises = Array.from(selectedPosts).map(async (postId) => {
        const response = await fetch(`/api/ai-cases/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        return postId
      })

      await Promise.all(deletePromises)

      alert(`선택한 ${selectedPosts.size}개 게시글이 삭제되었습니다.`)
      setSelectedPosts(new Set())
      setDeleteMode(false)
      
      // 목록 새로고침
      window.location.reload()
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(`삭제 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setDeleting(false)
    }
  }

  // 업로드된 사례 선택 토글
  const handleToggleUploadedSelection = (index: number) => {
    const newSelected = new Set(selectedUploaded)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedUploaded(newSelected)
  }

  const handleSelectAllUploaded = () => {
    const newSelected = new Set<number>()
    uploadedCases.forEach((item, index) => {
      if (!item.isDuplicate) {
        newSelected.add(index)
      }
    })
    setSelectedUploaded(newSelected)
  }

  const handleDeselectAllUploaded = () => {
    setSelectedUploaded(new Set())
  }

  // 업로드된 항목을 ai_cases에 저장
  const handleSaveUploadedCases = async () => {
    if (selectedUploaded.size === 0) {
      alert('저장할 사례를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedUploaded.size}개 사례를 저장하시겠습니까?`)) return

    try {
      setSaving(true)

      // 세션 토큰 가져오기
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setSaving(false)
        return
      }

      // 선택한 항목 수집
      const casesToSave = Array.from(selectedUploaded).map(index => {
        const item = uploadedCases[index]
        const caseItem: any = {
          title: item.title || '',
          content: item.content || item.activityDetails || '',
          sourceUrl: item.sourceUrl,
          authorName: item.authorName,
          authorEmail: item.authorEmail,
          employeeNumber: item.employeeNumber,
          leadingRole: item.leadingRole,
          activityDetails: item.activityDetails,
          aiUsageLevel: item.aiUsageLevel,
          aiUsageEvaluationReason: item.aiUsageEvaluationReason,
          outputName: item.outputName,
          aiTools: item.aiTools,
          developmentBackground: item.developmentBackground,
          features: item.features,
          usageEffects: item.usageEffects,
          developmentLevelEvaluationReason: item.developmentLevelEvaluationReason,
          submissionFormat: item.submissionFormat,
          attachedFileName: item.attachedFileName,
          attachedFileSize: item.attachedFileSize,
          publishedAt: item.publishedAt,
          external_id: item.external_id,
        }
        
        // undefined 값 제거
        Object.keys(caseItem).forEach(key => {
          if (caseItem[key] === undefined) {
            delete caseItem[key]
          }
        })
        
        return caseItem
      })

      console.log('[저장 요청] 선택된 항목:', casesToSave.length, '개')
      console.log('[저장 요청] 첫 번째 항목 샘플:', casesToSave[0])

      const response = await fetch('/api/ai-cases/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ caseItems: casesToSave }),
      })

      if (!response.ok) {
        let errorMessage = '알 수 없는 오류'
        try {
          const errorData = await response.json()
          console.error('[저장 오류] 응답 데이터:', errorData)
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (e) {
          const text = await response.text()
          console.error('[저장 오류] 응답 텍스트:', text)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[저장 결과]', result)
      console.log('[저장 결과] 에러 상세:', result.errors)

      if (result.success) {
        let message = `저장 완료!\n${result.saved}개 사례가 저장되었습니다.`
        if (result.skipped > 0) {
          message += `\n${result.skipped}개는 중복되어 건너뛰었습니다.`
        }
        if (result.errors && result.errors.length > 0) {
          message += `\n${result.errors.length}개 저장 실패:\n${result.errors.slice(0, 3).join('\n')}`
          if (result.errors.length > 3) {
            message += `\n... 외 ${result.errors.length - 3}개`
          }
        }
        alert(message)
        
        // 저장된 항목 제거 및 목록 새로고침
        const remainingCases = uploadedCases.filter((_, index) => !selectedUploaded.has(index))
        setUploadedCases(remainingCases)
        setSelectedUploaded(new Set())
        // 목록 새로고침
        window.location.reload()
      } else {
        throw new Error(result.error || '저장 실패')
      }
    } catch (error: any) {
      console.error('저장 오류:', error)
      alert(`저장 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    async function fetchCases() {
      try {
        setLoading(true)
        setError(null)
        
        // 클라이언트에서 직접 Supabase 사용
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        console.log('[AI 활용사례] 게시글 조회 시작 - 검색어:', debouncedSearchQuery, '페이지:', currentPage)
        
        // 페이지네이션 적용
        const from = (currentPage - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1
        
        // 검색어가 있으면 각 필드를 개별적으로 검색하고 병합 (검색 API와 동일한 방식)
        let postsData: any[] = []
        let totalCount = 0
        
        if (debouncedSearchQuery) {
          const searchPattern = `%${debouncedSearchQuery}%`
          
          // 각 필드별로 검색
          const [titleResult, contentResult, toolsResult, backgroundResult] = await Promise.all([
            supabase
              .from('ai_cases')
              .select('*', { count: 'exact' })
              .ilike('title', searchPattern),
            supabase
              .from('ai_cases')
              .select('*', { count: 'exact' })
              .ilike('content', searchPattern),
            supabase
              .from('ai_cases')
              .select('*', { count: 'exact' })
              .ilike('ai_tools', searchPattern),
            supabase
              .from('ai_cases')
              .select('*', { count: 'exact' })
              .ilike('development_background', searchPattern),
          ])
          
          // 결과 병합 및 중복 제거
          const allResults = [
            ...(titleResult.data || []),
            ...(contentResult.data || []),
            ...(toolsResult.data || []),
            ...(backgroundResult.data || []),
          ]
          
          const uniqueMap = new Map()
          allResults.forEach((item: any) => {
            if (!uniqueMap.has(item.id)) {
              uniqueMap.set(item.id, item)
            }
          })
          
          const uniqueResults = Array.from(uniqueMap.values())
            .sort((a: any, b: any) => {
              // 고정 게시글 먼저
              if (a.is_pinned !== b.is_pinned) {
                return a.is_pinned ? -1 : 1
              }
              // 그 다음 published_at
              const aDate = a.published_at || a.created_at
              const bDate = b.published_at || b.created_at
              return new Date(bDate).getTime() - new Date(aDate).getTime()
            })
          
          totalCount = uniqueResults.length
          postsData = uniqueResults.slice(from, to + 1)
          
          // 에러 확인
          if (titleResult.error) {
            console.error('[AI 활용사례] 제목 검색 오류:', titleResult.error)
          }
          if (contentResult.error) {
            console.error('[AI 활용사례] 내용 검색 오류:', contentResult.error)
          }
          if (toolsResult.error) {
            console.error('[AI 활용사례] AI 도구 검색 오류:', toolsResult.error)
          }
          if (backgroundResult.error) {
            console.error('[AI 활용사례] 개발 배경 검색 오류:', backgroundResult.error)
          }
        } else {
          // 검색어가 없으면 일반 조회
          const { data, error, count } = await supabase
            .from('ai_cases')
            .select('*', { count: 'exact' })
            .order('is_pinned', { ascending: false })
            .order('published_at', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, to)
          
          if (error) {
            console.error('[AI 활용사례] 게시글 조회 오류:', error)
            throw new Error(error.message || '게시글을 불러오는데 실패했습니다.')
          }
          
          postsData = data || []
          totalCount = count || 0
        }
        
        const postsError = null // 에러는 위에서 처리됨
        
        setTotalCount(totalCount)
        
        const postsDataToUse = postsData || []
        
        console.log('[AI 활용사례] 조회된 게시글 수:', postsDataToUse?.length || 0)
        
        if (!postsDataToUse || postsDataToUse.length === 0) {
          setPosts([])
          setError(null)
          setLoading(false)
          return
        }
        
        // first_engineer 테이블에서 데이터 가져오기
        const employeeNumbers = postsDataToUse
          .map((post: any) => post.employee_number)
          .filter((num: string | null) => num !== null && num !== undefined)
        
        let engineerDataMap = new Map<string, any>()
        if (employeeNumbers.length > 0) {
          const { data: engineerData, error: engineerError } = await supabase
            .from('first_engineer')
            .select('*')
            .in('employee_id', employeeNumbers)
          
          if (!engineerError && engineerData) {
            engineerData.forEach((engineer: any) => {
              engineerDataMap.set(engineer.employee_id, engineer)
            })
          }
        }
        
        // AI 활용사례는 외부에서 가져온 데이터이므로 프로필 정보는 author_name, author_email 사용
        // attached_file_url이 없으면 source_url을 사용
        const postsWithCounts = postsDataToUse.map((post: any) => {
          const engineerData = post.employee_number ? engineerDataMap.get(post.employee_number) : null
          
          return {
            ...post,
            attached_file_url: post.attached_file_url || post.source_url || null,
            engineer_data: engineerData, // first_engineer 데이터 추가
            user: {
              email: post.author_email || null,
              name: post.author_name || null,
              nickname: post.author_name || null,
              avatar_url: null,
              company: null,
              team: null,
              position: null,
            },
            likes_count: 0, // AI 활용사례는 좋아요/댓글 기능 없음
            comments_count: 0,
            user_id: post.imported_by || null, // imported_by를 user_id로 매핑
          }
        })
        
        console.log('[AI 활용사례] 게시글 조회 완료 - 총', postsWithCounts.length, '개')
        setPosts(postsWithCounts)
        setError(null)
      } catch (error) {
        console.error('[AI 활용사례] 예외 발생:', error)
        setError(error instanceof Error ? error.message : '게시글을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    if (!authLoading) {
      fetchCases()
    }
    
    // 게시글 작성 이벤트 리스너
    const handlePostCreated = () => {
      console.log('[AI 활용사례] 게시글 작성 이벤트 수신, 목록 새로고침')
      fetchCases()
    }
    
    // AI 활용사례 업데이트 이벤트 리스너
    const handleCasesUpdated = () => {
      console.log('[AI 활용사례] 업데이트 이벤트 수신, 목록 새로고침')
      fetchCases()
    }
    
    window.addEventListener('post-created', handlePostCreated)
    window.addEventListener('cases-updated', handleCasesUpdated)
    
    return () => {
      window.removeEventListener('post-created', handlePostCreated)
      window.removeEventListener('cases-updated', handleCasesUpdated)
    }
  }, [authLoading, debouncedSearchQuery, currentPage])
  
  // 검색어 변경 시 디바운스 처리 및 첫 페이지로 리셋 (Navbar와 동일한 방식)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // 검색어가 변경되면 첫 페이지로 리셋
    setCurrentPage(1)
    
    // 디바운스: 300ms 후에 debouncedSearchQuery 업데이트
    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery.trim())
      }, 300) // 300ms 디바운스
    } else {
      setDebouncedSearchQuery('')
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
          <Link
            href="/login"
            className="inline-block bg-ok-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-ok-dark transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-700 font-semibold mb-2">오류가 발생했습니다</p>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 제목 및 설명 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">AI 활용사례</h1>
          <p className="text-gray-600 text-base mb-4">
            AI 엔지니어들의 개발 성과를 모아둔 아카이빙 공간입니다. 실제 활용 사례를 참고해 새로운 태스크를 발굴해 보세요.
          </p>
          
          {/* 검색 기능 */}
          <div className="relative max-w-md">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-ok-primary focus:ring-1 focus:ring-ok-primary text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="검색어 지우기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 엑셀 업로드 및 삭제 버튼 */}
        {isAdmin && (
          <div className="mb-6 flex justify-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
              id="excel-upload-input"
              disabled={uploading}
            />
            <label
              htmlFor="excel-upload-input"
              className={`bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg cursor-pointer ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? '업로드 중...' : '엑셀 업로드'}
            </label>
            <button
              onClick={() => {
                if (deleteMode && selectedPosts.size > 0) {
                  handleDeleteSelected()
                } else {
                  setDeleteMode(!deleteMode)
                  if (!deleteMode) {
                    setSelectedPosts(new Set())
                  }
                }
              }}
              disabled={deleting || (deleteMode && selectedPosts.size === 0)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors shadow-md hover:shadow-lg ${
                deleting || (deleteMode && selectedPosts.size === 0)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : deleteMode
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {deleting 
                ? '삭제 중...' 
                : deleteMode 
                ? selectedPosts.size > 0 
                  ? `삭제하기 (${selectedPosts.size})` 
                  : '취소'
                : '삭제하기'}
            </button>
          </div>
        )}

        {/* 업로드된 사례 미리보기 */}
        {uploadedCases.length > 0 && isAdmin && (
          <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                업로드된 사례 ({uploadedCases.length}개)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllUploaded}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  전체 선택
                </button>
                <button
                  onClick={handleDeselectAllUploaded}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  전체 해제
                </button>
                <button
                  onClick={handleSaveUploadedCases}
                  disabled={saving || selectedUploaded.size === 0}
                  className={`px-4 py-1 text-sm font-semibold rounded-lg transition-colors ${
                    saving || selectedUploaded.size === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-ok-primary text-white hover:bg-ok-dark'
                  }`}
                >
                  {saving ? '저장 중...' : `저장하기 (${selectedUploaded.size})`}
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {uploadedCases.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    item.isDuplicate
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUploaded.has(index)}
                    onChange={() => handleToggleUploadedSelection(index)}
                    disabled={item.isDuplicate}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title || '제목 없음'}</h3>
                      {item.isDuplicate && (
                        <span className="px-2 py-0.5 text-xs bg-red-200 text-red-700 rounded">
                          중복
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {item.authorName && <div>작성자: {item.authorName}</div>}
                      {item.employeeNumber && <div>사원번호: {item.employeeNumber}</div>}
                      {item.leadingRole && <div>리딩역할: {item.leadingRole}</div>}
                      {item.aiTools && <div>AI 도구: {item.aiTools}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && uploadedCases.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="text-center py-12">
              <p className="text-gray-500">아직 작성된 게시글이 없습니다.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {isAdmin && deleteMode && posts.length > 0 && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPosts.size === posts.length && posts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSelectAllPosts()
                      } else {
                        handleDeselectAllPosts()
                      }
                    }}
                    className="w-4 h-4 text-ok-primary rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">
                    전체 선택 ({selectedPosts.size}/{posts.length})
                  </span>
                </div>
              </div>
            )}
            {posts.map((post: any) => (
              <div key={post.id} className={`relative ${isAdmin && deleteMode ? 'pl-10' : ''}`}>
                {isAdmin && deleteMode && (
                  <div 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPosts.has(post.id)}
                      onChange={() => handleTogglePostSelection(post.id)}
                      className="w-4 h-4 text-ok-primary rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <div onClick={(e) => {
                  if (isAdmin && deleteMode && (e.target as HTMLElement).closest('input[type="checkbox"]')) {
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }}>
                  <PostListItem post={post} linkPrefix="/cases" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 페이지네이션 */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              이전
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                .filter(page => {
                  // 현재 페이지 주변 5개만 표시
                  return page === 1 || 
                         page === Math.ceil(totalCount / ITEMS_PER_PAGE) ||
                         (page >= currentPage - 2 && page <= currentPage + 2)
                })
                .map((page, index, array) => {
                  // 페이지 번호 사이에 ... 표시
                  const showEllipsis = index > 0 && array[index] - array[index - 1] > 1
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-ok-primary text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  )
                })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), prev + 1))}
              disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              다음
            </button>
          </div>
        )}
        
        {/* 페이지 정보 */}
        {totalCount > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            전체 {totalCount}개 중 {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}개 표시
          </div>
        )}
      </div>
    </div>
  )
}
