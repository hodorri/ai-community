'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CoP } from '@/lib/types/database'
import Image from 'next/image'

// 관리자 이메일 (환경 변수에서 가져오거나 설정)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

type TabType = 'users' | 'cops' | 'news'
type NewsFilterType = 'all' | 'crawled' | 'published'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [allCops, setAllCops] = useState<CoP[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedCops, setSelectedCops] = useState<Set<string>>(new Set())
  const [deletingUsers, setDeletingUsers] = useState(false)
  const [deletingCops, setDeletingCops] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUsers, setEditingUsers] = useState(false)
  const [editingCops, setEditingCops] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [newsFilter, setNewsFilter] = useState<NewsFilterType>('all')
  const [uploading, setUploading] = useState(false)
  // 업로드된 뉴스 (메모리에만 저장, DB 저장 전)
  const [uploadedNews, setUploadedNews] = useState<Array<{
    title: string
    content: string
    sourceUrl: string
    sourceSite: string
    isDuplicate: boolean
    isPublished: boolean
  }>>([])
  // 저장된 뉴스 (crawled_news 테이블에서 가져옴)
  const [crawledNews, setCrawledNews] = useState<Array<{
    id: string
    title: string
    content: string
    sourceUrl: string
    sourceSite: string
    isDuplicate: boolean
    isPublished: boolean
  }>>([])
  const [selectedUploaded, setSelectedUploaded] = useState<Set<number>>(new Set()) // 업로드된 항목 선택 (인덱스)
  const [selectedCrawled, setSelectedCrawled] = useState<Set<string>>(new Set()) // 저장된 항목 선택 (ID)
  const [selectedPublished, setSelectedPublished] = useState<Set<string>>(new Set()) // 게시된 항목 선택 (ID)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [publishedNews, setPublishedNews] = useState<any[]>([])
  const [bulkUpdating, setBulkUpdating] = useState(false) // 일괄 수정 중
  const [bulkUpdateImage, setBulkUpdateImage] = useState<File | null>(null) // 일괄 수정용 이미지 파일
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false) // 일괄 수정 모달 표시 여부

  useEffect(() => {
    const checkAdmin = async () => {
      if (!authLoading && !user) {
        router.push('/login')
        return
      }

      if (!user) return

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle()

        const adminCheck = profile?.email === ADMIN_EMAIL
        setIsAdmin(adminCheck)

        if (!adminCheck) {
          router.push('/')
          return
        }

        if (adminCheck) {
          fetchAllUsers()
          fetchAllCops()
        }
      } catch (error) {
        console.error('관리자 확인 오류:', error)
        setIsAdmin(false)
        router.push('/')
      }
    }

    checkAdmin()
  }, [user, authLoading, router, supabase])

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setAllUsers(data as Profile[])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCops = async () => {
    try {
      console.log('[관리자] CoP 조회 시작')
      // 먼저 cops만 조회 (조인 없이)
      const { data: copsData, error: copsError } = await supabase
        .from('cops')
        .select('*')
        .order('created_at', { ascending: false })

      if (copsError) {
        console.error('[관리자] CoP 조회 오류:', copsError)
        setAllCops([])
        return
      }

      console.log('[관리자] 조회된 CoP 개수:', copsData?.length || 0)
      console.log('[관리자] CoP 데이터:', copsData)

      if (!copsData || copsData.length === 0) {
        console.log('[관리자] CoP 데이터가 없습니다.')
        setAllCops([])
        return
      }

      // 각 cop의 user_id로 profiles 조회
      const copsWithUsers = await Promise.all(
        copsData.map(async (cop) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, name, nickname')
            .eq('id', cop.user_id)
            .maybeSingle()

          return {
            ...cop,
            user: profileData || null,
          } as CoP
        })
      )

      console.log('[관리자] 프로필 정보 포함된 CoP:', copsWithUsers)
      console.log('[관리자] pending 상태 CoP:', copsWithUsers.filter(c => c.status === 'pending'))
      setAllCops(copsWithUsers)
    } catch (error) {
      console.error('[관리자] CoP 조회 예외:', error)
      setAllCops([])
    }
  }

  const filteredUsers = filterStatus === 'all' 
    ? allUsers 
    : allUsers.filter(u => u.status === filterStatus)

  const handleApprove = async (userId: string) => {
    try {
      // 클라이언트 사이드에서 직접 업데이트 (RLS 정책이 관리자 업데이트를 허용)
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('승인 오류:', error)
        alert('승인 실패: ' + error.message)
        return
      }

      alert('승인 완료!')
      // 목록 새로고침
      fetchAllUsers()
    } catch (error) {
      console.error('Error approving user:', error)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      // 클라이언트 사이드에서 직접 업데이트 (RLS 정책이 관리자 업데이트를 허용)
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('거부 오류:', error)
        alert('거부 실패: ' + error.message)
        return
      }

      alert('거부 완료!')
      // 목록 새로고침
      fetchAllUsers()
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('거부 중 오류가 발생했습니다.')
    }
  }

  const handleApproveCop = async (copId: string) => {
    try {
      const { data, error } = await supabase
        .from('cops')
        .update({ status: 'approved' })
        .eq('id', copId)
        .select()
        .single()

      if (error) {
        console.error('CoP 승인 오류:', error)
        alert('승인 실패: ' + error.message)
        return
      }

      alert('CoP 승인 완료!')
      fetchAllCops()
    } catch (error) {
      console.error('Error approving cop:', error)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  const handleRejectCop = async (copId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      const { data, error } = await supabase
        .from('cops')
        .update({ status: 'rejected' })
        .eq('id', copId)
        .select()
        .single()

      if (error) {
        console.error('CoP 거부 오류:', error)
        alert('거부 실패: ' + error.message)
        return
      }

      alert('CoP 거부 완료!')
      fetchAllCops()
    } catch (error) {
      console.error('Error rejecting cop:', error)
      alert('거부 중 오류가 발생했습니다.')
    }
  }

  // 사용자 선택 토글
  const handleToggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAllUsers = () => {
    const newSelected = new Set<string>()
    filteredUsers.forEach((user) => {
      if (user.id) {
        newSelected.add(user.id)
      }
    })
    setSelectedUsers(newSelected)
  }

  const handleDeselectAllUsers = () => {
    setSelectedUsers(new Set())
  }

  // CoP 선택 토글
  const handleToggleCopSelection = (copId: string) => {
    const newSelected = new Set(selectedCops)
    if (newSelected.has(copId)) {
      newSelected.delete(copId)
    } else {
      newSelected.add(copId)
    }
    setSelectedCops(newSelected)
  }

  const handleSelectAllCops = () => {
    const newSelected = new Set<string>()
    filteredCops.forEach((cop) => {
      if (cop.id) {
        newSelected.add(cop.id)
      }
    })
    setSelectedCops(newSelected)
  }

  const handleDeselectAllCops = () => {
    setSelectedCops(new Set())
  }

  // 사용자 일괄 삭제
  const handleDeleteUsers = async () => {
    if (selectedUsers.size === 0) {
      alert('삭제할 사용자를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedUsers.size}명의 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return

    try {
      setDeletingUsers(true)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setDeletingUsers(false)
        return
      }

      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ userIds: Array.from(selectedUsers) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      const result = await response.json()

      if (result.success) {
        alert(`삭제 완료!\n${result.deleted}명의 사용자가 삭제되었습니다.`)
        setSelectedUsers(new Set())
        fetchAllUsers()
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(`삭제 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setDeletingUsers(false)
    }
  }

  // CoP 일괄 삭제
  const handleDeleteCops = async () => {
    if (selectedCops.size === 0) {
      alert('삭제할 CoP를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCops.size}개의 CoP를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return

    try {
      setDeletingCops(true)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setDeletingCops(false)
        return
      }

      const response = await fetch('/api/cops/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ copIds: Array.from(selectedCops) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      const result = await response.json()

      if (result.success) {
        alert(`삭제 완료!\n${result.deleted}개의 CoP가 삭제되었습니다.`)
        setSelectedCops(new Set())
        fetchAllCops()
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(`삭제 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setDeletingCops(false)
    }
  }

  const fetchPublishedNews = async () => {
    try {
      // news 테이블과 selected_news 테이블에서 모두 조회
      const [newsResult, selectedNewsResult] = await Promise.all([
        supabase
          .from('news')
          .select('*')
          .eq('is_manual', false)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('selected_news')
          .select('*')
          .order('selected_at', { ascending: false })
          .limit(100),
      ])

      if (newsResult.error) {
        console.error('게시된 뉴스 조회 오류:', newsResult.error)
        return
      }

      if (selectedNewsResult.error) {
        console.error('선택된 뉴스 조회 오류:', selectedNewsResult.error)
        return
      }

      // 두 테이블의 데이터를 합치고 날짜순으로 정렬
      const allPublished = [
        ...(newsResult.data || []).map(item => ({
          ...item,
          published_at: item.published_at || item.created_at,
        })),
        ...(selectedNewsResult.data || []).map(item => ({
          ...item,
          published_at: item.published_at || item.selected_at,
        })),
      ].sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at || a.selected_at).getTime()
        const dateB = new Date(b.published_at || b.created_at || b.selected_at).getTime()
        return dateB - dateA
      })

      setPublishedNews(allPublished)
    } catch (error) {
      console.error('게시된 뉴스 조회 예외:', error)
    }
  }

  const fetchCrawledNews = async () => {
    try {
      const { data, error } = await supabase
        .from('crawled_news')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('크롤링 내역 조회 오류:', error)
        return
      }

      // 중복 체크 (이미 news 또는 selected_news에 게시된 것인지)
      const newsWithStatus = await Promise.all(
        (data || []).map(async (item) => {
          // news 테이블 확인
          const { data: existingNews } = await supabase
            .from('news')
            .select('id')
            .eq('source_url', item.source_url)
            .maybeSingle()

          // selected_news 테이블 확인 (crawled_news_id로 연결된 항목)
          const { data: existingSelected } = await supabase
            .from('selected_news')
            .select('id')
            .eq('crawled_news_id', item.id)
            .maybeSingle()

          // is_published가 true이거나 news/selected_news에 이미 있는 경우 게시됨으로 표시
          const isPublished = item.is_published || !!existingNews || !!existingSelected

          return {
            id: item.id,
            title: item.title,
            content: item.content || '',
            sourceUrl: item.source_url || '',
            sourceSite: item.source_site || '네이버 뉴스',
            isDuplicate: !!existingNews, // news에 이미 있는 경우만 중복
            isPublished: isPublished,
          }
        })
      )

      console.log('[크롤링 내역] 조회 완료:', newsWithStatus.length, '개')
      setCrawledNews(newsWithStatus)
    } catch (error) {
      console.error('크롤링 내역 조회 예외:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'news' && isAdmin) {
      // 게시됨 필터일 때는 게시된 뉴스만 조회
      if (newsFilter === 'published') {
        fetchPublishedNews()
      } else {
        // 전체 또는 수집 내역 필터일 때
        fetchPublishedNews()
        if (newsFilter === 'all' || newsFilter === 'crawled') {
          fetchCrawledNews()
        }
      }
    }
  }, [activeTab, isAdmin, newsFilter, supabase])

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 확장자 확인
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    try {
      setUploading(true)
      setUploadedNews([])
      setSelectedUploaded(new Set())

      // 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setUploading(false)
        return
      }

      // FormData 생성
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-news-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = '알 수 없는 오류'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success) {
        setUploadedNews(result.news || [])
        // 중복이 아닌 항목만 자동 선택
        const newSelected = new Set<number>()
        result.news?.forEach((item: any, index: number) => {
          if (!item.isDuplicate && !item.isPublished) {
            newSelected.add(index)
          }
        })
        setSelectedUploaded(newSelected)
        alert(`엑셀 파일 업로드 완료!\n총 ${result.total}개 기사를 불러왔습니다.`)
      } else {
        throw new Error(result.error || result.details || '업로드 실패')
      }
    } catch (error: any) {
      console.error('엑셀 업로드 오류:', error)
      const errorMessage = error?.message || '엑셀 파일 업로드 중 오류가 발생했습니다.'
      alert(`업로드 실패: ${errorMessage}`)
    } finally {
      setUploading(false)
      // 파일 input 초기화
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  // 업로드된 뉴스 선택 토글
  const handleToggleUploadedSelection = (index: number) => {
    const newSelected = new Set(selectedUploaded)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedUploaded(newSelected)
  }

  // 저장된 뉴스 선택 토글
  const handleToggleCrawledSelection = (id: string) => {
    const newSelected = new Set(selectedCrawled)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCrawled(newSelected)
  }

  const handleSelectAllUploaded = () => {
    const newSelected = new Set<number>()
    uploadedNews.forEach((item, index) => {
      if (!item.isDuplicate && !item.isPublished) {
        newSelected.add(index)
      }
    })
    setSelectedUploaded(newSelected)
  }

  const handleDeselectAllUploaded = () => {
    setSelectedUploaded(new Set())
  }

  const handleSelectAllCrawled = () => {
    const newSelected = new Set<string>()
    crawledNews.forEach((item) => {
      if (!item.isDuplicate && !item.isPublished && item.id) {
        newSelected.add(item.id)
      }
    })
    setSelectedCrawled(newSelected)
  }

  const handleDeselectAllCrawled = () => {
    setSelectedCrawled(new Set())
  }

  // 업로드된 항목을 crawled_news에 저장
  const handleSaveUploadedNews = async () => {
    if (selectedUploaded.size === 0) {
      alert('저장할 기사를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedUploaded.size}개 기사를 저장하시겠습니까?`)) return

    try {
      setSaving(true)

      // 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setSaving(false)
        return
      }

      // 선택한 항목 수집
      const newsToSave = Array.from(selectedUploaded).map(index => {
        const item = uploadedNews[index]
        return {
          title: item.title,
          content: item.content,
          sourceUrl: item.sourceUrl,
          sourceSite: item.sourceSite,
        }
      })

      const response = await fetch('/api/crawled-news/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ newsItems: newsToSave }),
      })

      if (!response.ok) {
        let errorMessage = '알 수 없는 오류'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success) {
        let message = `저장 완료!\n${result.saved}개 기사가 저장되었습니다.`
        if (result.skipped > 0) {
          message += `\n${result.skipped}개는 중복되어 건너뛰었습니다.`
        }
        if (result.errors && result.errors.length > 0) {
          message += `\n${result.errors.length}개 저장 실패`
        }
        alert(message)
        
        // 저장된 항목 제거 및 목록 새로고침
        const remainingNews = uploadedNews.filter((_, index) => !selectedUploaded.has(index))
        setUploadedNews(remainingNews)
        setSelectedUploaded(new Set())
        if (activeTab === 'news') {
          fetchCrawledNews()
        }
      } else {
        throw new Error(result.error || '저장 실패')
      }
    } catch (error: any) {
      console.error('저장 오류:', error)
      const errorMessage = error?.message || '저장 중 오류가 발생했습니다.'
      alert(`저장 실패: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // 저장된 항목을 news에 게시
  const handlePublishCrawledNews = async () => {
    if (selectedCrawled.size === 0) {
      alert('게시할 기사를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCrawled.size}개 기사를 게시하시겠습니까?`)) return

    try {
      setPublishing(true)

      // 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setPublishing(false)
        return
      }

      // 선택한 항목의 ID 수집 (서버에서 필터링하므로 모든 선택된 ID 전송)
      const crawledNewsIds = Array.from(selectedCrawled).filter((id): id is string => {
        const item = crawledNews.find(n => n.id === id)
        // 항목이 존재하는지만 확인 (중복/게시 여부는 서버에서 처리)
        return !!item
      })

      if (crawledNewsIds.length === 0) {
        alert('게시할 항목을 선택해주세요.')
        setPublishing(false)
        return
      }

      console.log('[게시] 선택된 ID:', crawledNewsIds)

      const response = await fetch('/api/crawled-news/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ crawledNewsIds }),
      })

      if (!response.ok) {
        let errorMessage = '알 수 없는 오류'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success) {
        let message = `게시 완료!\n${result.published}개 기사가 게시되었습니다.`
        if (result.skipped > 0) {
          message += `\n${result.skipped}개는 중복되어 건너뛰었습니다.`
        }
        if (result.errors && result.errors.length > 0) {
          message += `\n${result.errors.length}개 게시 실패`
        }
        alert(message)
        
        // 선택 초기화 및 목록 새로고침
        setSelectedCrawled(new Set())
        if (activeTab === 'news') {
          fetchCrawledNews()
          fetchPublishedNews()
        }
      } else {
        throw new Error(result.error || '게시 실패')
      }
    } catch (error: any) {
      console.error('게시 오류:', error)
      const errorMessage = error?.message || '게시 중 오류가 발생했습니다.'
      alert(`게시 실패: ${errorMessage}`)
    } finally {
      setPublishing(false)
    }
  }

  // 게시된 뉴스 선택 토글
  const handleTogglePublishedSelection = (id: string) => {
    const newSelected = new Set(selectedPublished)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedPublished(newSelected)
  }

  const handleSelectAllPublished = () => {
    const newSelected = new Set<string>()
    publishedNews.forEach((item) => {
      if (item.id) {
        newSelected.add(item.id)
      }
    })
    setSelectedPublished(newSelected)
  }

  const handleDeselectAllPublished = () => {
    setSelectedPublished(new Set())
  }

  // 수집 내역 삭제
  const handleDeleteCrawledNews = async () => {
    if (selectedCrawled.size === 0) {
      alert('삭제할 기사를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCrawled.size}개 기사를 삭제하시겠습니까?`)) return

    try {
      setDeleting(true)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setDeleting(false)
        return
      }

      const response = await fetch('/api/crawled-news/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ crawledNewsIds: Array.from(selectedCrawled) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      const result = await response.json()

      if (result.success) {
        if (result.deleted > 0) {
          alert(`삭제 완료!\n${result.deleted}개 기사가 삭제되었습니다.`)
        } else {
          alert(`삭제할 항목을 찾을 수 없습니다.`)
        }
        setSelectedCrawled(new Set())
        // 목록 강제 새로고침
        await fetchCrawledNews()
        // 추가로 약간의 지연 후 다시 한 번 새로고침 (캐시 문제 방지)
        setTimeout(() => {
          fetchCrawledNews()
        }, 500)
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(`삭제 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setDeleting(false)
    }
  }

  // 게시된 뉴스 삭제
  const handleDeletePublishedNews = async () => {
    if (selectedPublished.size === 0) {
      alert('삭제할 기사를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedPublished.size}개 기사를 삭제하시겠습니까?`)) return

    try {
      setDeleting(true)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setDeleting(false)
        return
      }

      const response = await fetch('/api/selected-news/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedPublished) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      const result = await response.json()

      if (result.success) {
        alert(`삭제 완료!\n${result.deleted}개 기사가 삭제되었습니다.`)
        setSelectedPublished(new Set())
        fetchPublishedNews()
        // 수집 내역도 새로고침하여 is_published 상태 반영
        if (newsFilter === 'all' || newsFilter === 'crawled') {
          fetchCrawledNews()
        }
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(`삭제 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setDeleting(false)
    }
  }

  // selected_news 일괄 수정 (작성자명과 이미지)
  const handleBulkUpdateSelectedNews = async () => {
    if (!bulkUpdateImage) {
      alert('이미지 파일을 선택해주세요.')
      return
    }

    if (!confirm('selected_news의 모든 항목의 작성자명을 \'읏맨\'으로, 이미지를 업로드한 이미지로 일괄 변경하시겠습니까?')) return

    try {
      setBulkUpdating(true)

      // 먼저 이미지 업로드
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        alert('세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        setBulkUpdating(false)
        return
      }

      // 이미지 업로드
      const formData = new FormData()
      formData.append('file', bulkUpdateImage)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || '이미지 업로드 실패')
      }

      const uploadResult = await uploadResponse.json()
      const imageUrl = uploadResult.url

      // 일괄 업데이트 API 호출
      const updateResponse = await fetch('/api/selected-news/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          authorName: '읏맨',
          imageUrl: imageUrl,
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || '일괄 수정 실패')
      }

      const updateResult = await updateResponse.json()

      if (updateResult.success) {
        alert(`일괄 수정 완료!\n${updateResult.updated}개 항목이 수정되었습니다.`)
        setShowBulkUpdateModal(false)
        setBulkUpdateImage(null)
        fetchPublishedNews()
        // 뉴스 목록도 새로고침
        window.dispatchEvent(new CustomEvent('news-updated'))
      } else {
        throw new Error(updateResult.error || '일괄 수정 실패')
      }
    } catch (error: any) {
      console.error('일괄 수정 오류:', error)
      alert(`일괄 수정 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setBulkUpdating(false)
    }
  }

  // 사용자 정보 수정
  const handleUpdateUser = async () => {
    if (selectedUsers.size !== 1) {
      alert('수정할 사용자를 1명만 선택해주세요.')
      return
    }

    const userId = Array.from(selectedUsers)[0]
    if (!userId) return

    try {
      setEditingUsers(true)

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editFormData.name || null,
          employee_number: editFormData.employee_number || null,
          company: editFormData.company || null,
          team: editFormData.team || null,
          position: editFormData.position || null,
        })
        .eq('id', userId)

      if (error) {
        throw new Error(error.message)
      }

      alert('사용자 정보가 수정되었습니다.')
      setShowEditModal(false)
      setEditFormData({})
      setSelectedUsers(new Set())
      fetchAllUsers()
    } catch (error: any) {
      console.error('수정 오류:', error)
      alert(`수정 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setEditingUsers(false)
    }
  }

  // CoP 정보 수정
  const handleUpdateCop = async () => {
    if (selectedCops.size !== 1) {
      alert('수정할 CoP를 1개만 선택해주세요.')
      return
    }

    const copId = Array.from(selectedCops)[0]
    if (!copId) return

    try {
      setEditingCops(true)

      const { error } = await supabase
        .from('cops')
        .update({
          name: editFormData.name || '',
          description: editFormData.description || null,
          max_members: editFormData.max_members || 0,
          activity_plan: editFormData.activity_plan || null,
          ai_tools: editFormData.ai_tools || null,
        })
        .eq('id', copId)

      if (error) {
        throw new Error(error.message)
      }

      alert('CoP 정보가 수정되었습니다.')
      setShowEditModal(false)
      setEditFormData({})
      setSelectedCops(new Set())
      fetchAllCops()
    } catch (error: any) {
      console.error('수정 오류:', error)
      alert(`수정 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setEditingCops(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const filteredCops = filterStatus === 'all' 
    ? allCops 
    : allCops.filter(c => {
        const matches = c.status === filterStatus
        if (!matches && c.status) {
          console.log(`[필터] CoP ${c.id} 상태 불일치:`, { 
            copStatus: c.status, 
            filterStatus, 
            statusType: typeof c.status,
            filterType: typeof filterStatus
          })
        }
        return matches
      })

  console.log('[관리자] 필터 상태:', filterStatus)
  console.log('[관리자] 전체 CoP 개수:', allCops.length)
  console.log('[관리자] 필터링된 CoP 개수:', filteredCops.length)
  console.log('[관리자] 전체 CoP 상태 분포:', {
    pending: allCops.filter(c => c.status === 'pending').length,
    approved: allCops.filter(c => c.status === 'approved').length,
    rejected: allCops.filter(c => c.status === 'rejected').length,
    null: allCops.filter(c => !c.status).length,
    other: allCops.filter(c => c.status && !['pending', 'approved', 'rejected'].includes(c.status)).length
  })
  console.log('[관리자] 필터링된 CoP:', filteredCops)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        
        {/* 메인 탭 (사용자 관리 / CoP 관리 / 뉴스 관리) */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'users'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              사용자 관리
            </button>
            <button
              onClick={() => setActiveTab('cops')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'cops'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              CoP 관리
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'news'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              뉴스 관리
            </button>
          </div>
            {activeTab === 'news' && (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={uploading}
                  className="hidden"
                  id="excel-upload-input"
                />
                <label
                  htmlFor="excel-upload-input"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    uploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-ok-primary text-white hover:bg-ok-dark'
                  }`}
                >
                  {uploading ? '업로드 중...' : '📊 엑셀 파일 업로드'}
                </label>
              </div>
            )}
        </div>

        {activeTab !== 'news' && (
          <>
            <p className="text-gray-600 mb-4">
              {activeTab === 'users' ? '사용자 관리' : activeTab === 'cops' ? 'CoP 관리' : '뉴스 관리'}
            </p>
            
            {/* 필터 탭 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilterStatus('all')
                  setSelectedUsers(new Set())
                  setSelectedCops(new Set())
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => {
                  setFilterStatus('pending')
                  setSelectedUsers(new Set())
                  setSelectedCops(new Set())
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                승인 대기
              </button>
              <button
                onClick={() => {
                  setFilterStatus('approved')
                  setSelectedUsers(new Set())
                  setSelectedCops(new Set())
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                승인됨
              </button>
              <button
                onClick={() => {
                  setFilterStatus('rejected')
                  setSelectedUsers(new Set())
                  setSelectedCops(new Set())
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                거부됨
              </button>
              </div>
              {activeTab === 'users' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (selectedUsers.size === 0) {
                        alert('수정할 사용자를 선택해주세요.')
                        return
                      }
                      if (selectedUsers.size > 1) {
                        alert('수정은 1명만 선택 가능합니다.')
                        return
                      }
                      const selectedUser = allUsers.find(u => selectedUsers.has(u.id))
                      if (selectedUser) {
                        setEditFormData({
                          name: selectedUser.name || '',
                          employee_number: selectedUser.employee_number || '',
                          email: selectedUser.email || '',
                          company: selectedUser.company || '',
                          team: selectedUser.team || '',
                          position: selectedUser.position || '',
                        })
                        setShowEditModal(true)
                      }
                    }}
                    disabled={selectedUsers.size === 0 || selectedUsers.size > 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedUsers.size === 0 || selectedUsers.size > 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    수정하기 {selectedUsers.size > 1 ? '(1명만)' : ''}
                  </button>
                  <button
                    onClick={handleDeleteUsers}
                    disabled={deletingUsers || selectedUsers.size === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      deletingUsers || selectedUsers.size === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {deletingUsers ? '삭제 중...' : `삭제하기 (${selectedUsers.size})`}
                  </button>
                </div>
              )}
              {activeTab === 'cops' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (selectedCops.size === 0) {
                        alert('수정할 CoP를 선택해주세요.')
                        return
                      }
                      if (selectedCops.size > 1) {
                        alert('수정은 1개만 선택 가능합니다.')
                        return
                      }
                      const selectedCop = allCops.find(c => selectedCops.has(c.id))
                      if (selectedCop) {
                        setEditFormData({
                          name: selectedCop.name || '',
                          description: selectedCop.description || '',
                          max_members: selectedCop.max_members || 0,
                          activity_plan: selectedCop.activity_plan || '',
                          ai_tools: selectedCop.ai_tools || '',
                        })
                        setShowEditModal(true)
                      }
                    }}
                    disabled={selectedCops.size === 0 || selectedCops.size > 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCops.size === 0 || selectedCops.size > 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    수정하기 {selectedCops.size > 1 ? '(1개만)' : ''}
                  </button>
                  <button
                    onClick={handleDeleteCops}
                    disabled={deletingCops || selectedCops.size === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      deletingCops || selectedCops.size === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {deletingCops ? '삭제 중...' : `삭제하기 (${selectedCops.size})`}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'news' && (
          <>
            <p className="text-gray-600 mb-4">뉴스 관리</p>
            
            {/* 뉴스 필터 탭 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setNewsFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newsFilter === 'all'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setNewsFilter('crawled')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newsFilter === 'crawled'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                수집 내역
              </button>
              <button
                onClick={() => setNewsFilter('published')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newsFilter === 'published'
                    ? 'bg-ok-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                게시됨
              </button>
            </div>
          </>
        )}
      </div>

      {activeTab === 'users' ? (
        filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? '사용자가 없습니다.' 
                : filterStatus === 'pending'
                ? '승인 대기 중인 사용자가 없습니다.'
                : filterStatus === 'approved'
                ? '승인된 사용자가 없습니다.'
                : '거부된 사용자가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size > 0 && selectedUsers.size === filteredUsers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAllUsers()
                          } else {
                            handleDeselectAllUsers()
                          }
                        }}
                        className="w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사번
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={selectedUsers.has(user.id) ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => handleToggleUserSelection(user.id)}
                          className="w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.employee_number || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.status === 'pending' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            승인 대기
                          </span>
                        )}
                        {user.status === 'approved' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            승인됨
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            거부됨
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="text-ok-primary hover:text-ok-dark mr-4"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              거부
                            </button>
                          </>
                        )}
                        {user.status === 'rejected' && (
                          <span className="text-red-600 text-sm">거부됨</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'cops' ? (
        filteredCops.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? 'CoP가 없습니다.' 
                : filterStatus === 'pending'
                ? '승인 대기 중인 CoP가 없습니다.'
                : filterStatus === 'approved'
                ? '승인된 CoP가 없습니다.'
                : '거부된 CoP가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedCops.size > 0 && selectedCops.size === filteredCops.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAllCops()
                          } else {
                            handleDeselectAllCops()
                          }
                        }}
                        className="w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대표 이미지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      활동명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      멤버 정원
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCops.map((cop) => (
                    <tr key={cop.id} className={selectedCops.has(cop.id) ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCops.has(cop.id)}
                          onChange={() => handleToggleCopSelection(cop.id)}
                          className="w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cop.image_url ? (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <Image
                              src={cop.image_url}
                              alt={cop.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">이미지 없음</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{cop.name}</div>
                        {cop.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">
                            {cop.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {cop.user?.name || cop.user?.nickname || cop.user?.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{cop.max_members}명</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(cop.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cop.status === 'pending' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            승인 대기
                          </span>
                        )}
                        {cop.status === 'approved' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            승인됨
                          </span>
                        )}
                        {cop.status === 'rejected' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            거부됨
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {cop.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveCop(cop.id)}
                              className="text-ok-primary hover:text-ok-dark mr-4"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectCop(cop.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              거부
                            </button>
                          </>
                        )}
                        {cop.status === 'rejected' && (
                          <span className="text-red-600 text-sm">거부됨</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'news' ? (
        <>
          {/* 업로드된 뉴스 (엑셀에서 불러온 것, 아직 저장 안됨) - 전체 필터에서만 표시 */}
          {newsFilter === 'all' && uploadedNews.length > 0 && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">업로드된 뉴스</h3>
                  <p className="text-sm text-gray-600">
                    총 {uploadedNews.length}개 기사 · {selectedUploaded.size}개 선택됨
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllUploaded}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={handleDeselectAllUploaded}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    전체 해제
                  </button>
                  <button
                    onClick={handleSaveUploadedNews}
                    disabled={saving || selectedUploaded.size === 0}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      saving || selectedUploaded.size === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-ok-primary text-white hover:bg-ok-dark'
                    }`}
                  >
                    {saving ? '저장 중...' : `선택한 ${selectedUploaded.size}개 저장`}
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {uploadedNews.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      item.isDuplicate || item.isPublished
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : selectedUploaded.has(index)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUploaded.has(index)}
                        onChange={() => handleToggleUploadedSelection(index)}
                        disabled={item.isDuplicate || item.isPublished}
                        className="mt-1 w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                          {item.isDuplicate && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded whitespace-nowrap">
                              중복
                            </span>
                          )}
                          {item.isPublished && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded whitespace-nowrap">
                              게시됨
                            </span>
                          )}
                        </div>
                        {item.content && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{item.sourceSite}</span>
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ok-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              원문 보기 →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 저장된 뉴스 (crawled_news 테이블에서 가져온 것) - 수집 내역에서 조회 */}
          {(newsFilter === 'all' || newsFilter === 'crawled') && crawledNews.length > 0 && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {newsFilter === 'crawled' ? '수집 내역' : '저장된 뉴스'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    총 {crawledNews.length}개 기사 · {selectedCrawled.size}개 선택됨
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllCrawled}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={handleDeselectAllCrawled}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    전체 해제
                  </button>
                  <button
                    onClick={handlePublishCrawledNews}
                    disabled={publishing || selectedCrawled.size === 0}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      publishing || selectedCrawled.size === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-ok-primary text-white hover:bg-ok-dark'
                    }`}
                  >
                    {publishing ? '게시 중...' : `선택한 ${selectedCrawled.size}개 게시`}
                  </button>
                  <button
                    onClick={handleDeleteCrawledNews}
                    disabled={deleting || selectedCrawled.size === 0}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      deleting || selectedCrawled.size === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {deleting ? '삭제 중...' : `선택한 ${selectedCrawled.size}개 삭제`}
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {crawledNews.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg ${
                      item.isDuplicate || item.isPublished
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : selectedCrawled.has(item.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCrawled.has(item.id)}
                        onChange={() => handleToggleCrawledSelection(item.id)}
                        disabled={item.isDuplicate || item.isPublished}
                        className="mt-1 w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                          {item.isDuplicate && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded whitespace-nowrap">
                              중복
                            </span>
                          )}
                          {item.isPublished && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded whitespace-nowrap">
                              게시됨
                            </span>
                          )}
                        </div>
                        {item.content && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{item.sourceSite}</span>
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ok-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              원문 보기 →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 업로드/저장 내역이 없을 때 */}
          {newsFilter === 'all' && uploadedNews.length === 0 && crawledNews.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center">
              <p className="text-gray-500">엑셀 파일을 업로드하거나 저장된 내역이 없습니다.</p>
            </div>
          )}
          {newsFilter === 'crawled' && crawledNews.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center">
              <p className="text-gray-500">저장된 뉴스가 없습니다. 엑셀 파일을 업로드하고 저장해주세요.</p>
            </div>
          )}

          {/* 게시된 뉴스 (게시됨) */}
          {newsFilter === 'published' && (
            publishedNews.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">게시된 뉴스</h3>
                      <p className="text-sm text-gray-600 mt-1">총 {publishedNews.length}개 · {selectedPublished.size}개 선택됨</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllPublished}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        전체 선택
                      </button>
                      <button
                        onClick={handleDeselectAllPublished}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        전체 해제
                      </button>
                      <button
                        onClick={() => setShowBulkUpdateModal(true)}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors bg-ok-secondary text-white hover:bg-ok-dark"
                      >
                        일괄 수정
                      </button>
                      <button
                        onClick={handleDeletePublishedNews}
                        disabled={deleting || selectedPublished.size === 0}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          deleting || selectedPublished.size === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {deleting ? '삭제 중...' : `선택한 ${selectedPublished.size}개 삭제`}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {publishedNews.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-4 transition-colors ${
                        selectedPublished.has(item.id)
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPublished.has(item.id)}
                          onChange={() => handleTogglePublishedSelection(item.id)}
                          className="mt-1 w-4 h-4 text-ok-primary border-gray-300 rounded focus:ring-ok-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                          {item.content && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {typeof item.content === 'string' 
                                ? item.content.replace(/<[^>]*>/g, '').substring(0, 100)
                                : String(item.content).substring(0, 100)}...
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{item.source_site || '네이버 뉴스'}</span>
                            <span>·</span>
                            <span>{new Date(item.published_at || item.selected_at || item.created_at).toLocaleDateString('ko-KR')}</span>
                            {item.source_url && (
                              <>
                                <span>·</span>
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-ok-primary hover:underline"
                                >
                                  원문 보기 →
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center">
                <p className="text-gray-500">게시된 뉴스가 없습니다.</p>
              </div>
            )
          )}
        </>
      ) : null}

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeTab === 'users' ? '사용자 정보 수정' : 'CoP 정보 수정'}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditFormData({})
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 text-sm">
                {activeTab === 'users' ? '사용자 정보를 수정할 수 있습니다.' : 'CoP 정보를 수정할 수 있습니다.'}
              </p>
            </div>

            {activeTab === 'users' ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사번
                  </label>
                  <input
                    type="text"
                    value={editFormData.employee_number || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, employee_number: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="사번을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    disabled
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">이메일은 수정할 수 없습니다.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    회사
                  </label>
                  <input
                    type="text"
                    value={editFormData.company || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="회사명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    팀
                  </label>
                  <input
                    type="text"
                    value={editFormData.team || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, team: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="팀명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    직책
                  </label>
                  <input
                    type="text"
                    value={editFormData.position || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="직책을 입력하세요"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CoP 활동명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="예: AI 개발자 모임"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    간단 소개
                  </label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="CoP에 대한 간단한 소개를 입력해주세요."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    멤버 정원 수 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editFormData.max_members || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, max_members: parseInt(e.target.value) || 0 })}
                    required
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    활동 계획
                  </label>
                  <textarea
                    value={editFormData.activity_plan || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, activity_plan: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="CoP의 활동 계획을 입력해주세요."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    활용 예정 AI Tool
                  </label>
                  <input
                    type="text"
                    value={editFormData.ai_tools || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, ai_tools: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                    placeholder="예: ChatGPT, Claude, Midjourney, Runway 등"
                  />
                  <p className="text-xs text-gray-500 mt-1">활동에 활용할 AI 도구를 입력해주세요.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditFormData({})
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={activeTab === 'users' ? handleUpdateUser : handleUpdateCop}
                disabled={editingUsers || editingCops}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                  editingUsers || editingCops
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-ok-primary text-white hover:bg-ok-dark'
                }`}
              >
                {editingUsers || editingCops ? '수정 중...' : '수정하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 수정 모달 */}
      {showBulkUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">selected_news 일괄 수정</h2>
              <button
                onClick={() => {
                  setShowBulkUpdateModal(false)
                  setBulkUpdateImage(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작성자명
                </label>
                <input
                  type="text"
                  value="읏맨"
                  disabled
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">모든 항목의 작성자명이 &quot;읏맨&quot;으로 변경됩니다.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 파일
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setBulkUpdateImage(file)
                    }
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                />
                {bulkUpdateImage && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">선택된 파일: {bulkUpdateImage.name}</p>
                    <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={URL.createObjectURL(bulkUpdateImage)}
                        alt="미리보기"
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">모든 항목의 이미지가 업로드한 이미지로 변경됩니다.</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowBulkUpdateModal(false)
                  setBulkUpdateImage(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBulkUpdateSelectedNews}
                disabled={bulkUpdating || !bulkUpdateImage}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                  bulkUpdating || !bulkUpdateImage
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-ok-primary hover:bg-ok-dark'
                }`}
              >
                {bulkUpdating ? '수정 중...' : '일괄 수정하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
