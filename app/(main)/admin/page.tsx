'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CoP } from '@/lib/types/database'
import Image from 'next/image'

// 관리자 이메일 (환경 변수에서 가져오거나 설정)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'

type TabType = 'users' | 'cops' | 'guide'

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
  // 가이드 편집 관련
  const [guideData, setGuideData] = useState<any>(null)
  const [guideLoading, setGuideLoading] = useState(false)
  const [guideSaving, setGuideSaving] = useState(false)

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
      console.log('[승인] 시작 - 사용자 ID:', userId)
      console.log('[승인] 현재 로그인 사용자:', user?.email)
      console.log('[승인] 관리자 이메일:', ADMIN_EMAIL)
      
      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        console.log('[승인] 토큰 포함됨')
      } else {
        console.warn('[승인] 토큰 없음 - 쿠키만 사용')
      }
      
      // API 라우트를 통해 승인 (서버 사이드에서 처리)
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers,
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({ userId, status: 'approved' }),
      })

      const result = await response.json()
      console.log('[승인] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[승인] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`승인 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      alert('승인 완료!')
      // 목록 새로고침
      fetchAllUsers()
    } catch (error: any) {
      console.error('[승인] 예외 발생:', error)
      alert('승인 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      console.log('[거부] 시작 - 사용자 ID:', userId)
      console.log('[거부] 현재 로그인 사용자:', user?.email)
      
      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // API 라우트를 통해 거부 (서버 사이드에서 처리)
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers,
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({ userId, status: 'rejected' }),
      })

      const result = await response.json()
      console.log('[거부] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[거부] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`거부 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      alert('거부 완료!')
      // 목록 새로고침
      fetchAllUsers()
    } catch (error: any) {
      console.error('[거부] 예외 발생:', error)
      alert('거부 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
    }
  }

  const handleApproveCop = async (copId: string) => {
    try {
      console.log('[CoP 승인] 시작 - CoP ID:', copId)
      console.log('[CoP 승인] 현재 로그인 사용자:', user?.email)
      
      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // API 라우트를 통해 승인 (서버 사이드에서 처리)
      const response = await fetch('/api/admin/approve-cop', {
        method: 'POST',
        headers,
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({ copId, status: 'approved' }),
      })

      const result = await response.json()
      console.log('[CoP 승인] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[CoP 승인] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`승인 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      alert('CoP 승인 완료!')
      // 목록 새로고침
      fetchAllCops()
    } catch (error: any) {
      console.error('[CoP 승인] 예외 발생:', error)
      alert('승인 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
    }
  }

  const handleRejectCop = async (copId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return

    try {
      console.log('[CoP 거부] 시작 - CoP ID:', copId)
      console.log('[CoP 거부] 현재 로그인 사용자:', user?.email)
      
      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // API 라우트를 통해 거부 (서버 사이드에서 처리)
      const response = await fetch('/api/admin/approve-cop', {
        method: 'POST',
        headers,
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({ copId, status: 'rejected' }),
      })

      const result = await response.json()
      console.log('[CoP 거부] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[CoP 거부] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`거부 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      alert('CoP 거부 완료!')
      // 목록 새로고침
      fetchAllCops()
    } catch (error: any) {
      console.error('[CoP 거부] 예외 발생:', error)
      alert('거부 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
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

  useEffect(() => {
    if (activeTab === 'guide' && isAdmin) {
      fetchGuideContent()
    }
  }, [activeTab, isAdmin, supabase])

  const fetchGuideContent = async () => {
    try {
      setGuideLoading(true)
      console.log('[가이드 관리] 데이터 불러오기 시작...')
      
      const response = await fetch('/api/guide', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('[가이드 관리] API 응답:', result)
      
      if (result.data) {
        console.log('[가이드 관리] 데이터 있음, state 업데이트 시작:', result.data)
        setGuideData(result.data)
        console.log('[가이드 관리] state 업데이트 완료')
      } else {
        console.log('[가이드 관리] 데이터 없음, 기본값 사용')
        // 기본값 설정
        setGuideData({
          title: 'OKAI 가이드',
          welcome_title: '환영합니다!',
          welcome_content: 'OKAI 플랫폼에 오신 것을 환영합니다. 이 가이드를 통해 OKAI의 다양한 기능을 활용하는 방법을 알아보세요.',
          features: [
            { icon: '📰', title: '최신 AI 소식', description: '최신 AI 뉴스와 정보를 확인하고, 직접 뉴스를 작성하여 공유할 수 있습니다.' },
            { icon: '💡', title: 'AI 활용 사례', description: '실제 AI 활용 경험과 노하우를 공유하는 공간입니다.' },
            { icon: '🎓', title: 'AI CoP', description: 'AI 관련 커뮤니티 오브 프랙티스(CoP)를 만들고 참여하여 함께 학습하고 성장할 수 있습니다.' },
            { icon: '✨', title: '전체 피드', description: '로그인 후 모든 콘텐츠를 한눈에 볼 수 있는 통합 피드를 제공합니다.' }
          ],
          getting_started: [
            '회원가입 또는 로그인을 진행합니다.',
            '원하는 탭을 클릭하여 콘텐츠를 탐색합니다.',
            '글쓰기 버튼을 통해 자신의 경험과 지식을 공유합니다.',
            'AI CoP를 개설하거나 참여하여 커뮤니티 활동을 시작합니다.'
          ],
          tips: [
            '좋아요와 댓글을 통해 다른 사용자들과 소통해보세요.',
            '검색 기능을 활용하여 원하는 콘텐츠를 빠르게 찾을 수 있습니다.',
            '프로필 페이지에서 자신의 활동 내역을 확인할 수 있습니다.'
          ]
        })
      }
    } catch (error) {
      console.error('가이드 내용 불러오기 오류:', error)
      alert('가이드 내용을 불러오는데 실패했습니다.')
    } finally {
      setGuideLoading(false)
    }
  }

  const handleSaveGuide = async () => {
    if (!guideData) {
      alert('저장할 데이터가 없습니다.')
      return
    }

    try {
      setGuideSaving(true)
      console.log('[가이드 저장] 시작')
      console.log('[가이드 저장] 현재 로그인 사용자:', user?.email)

      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // API 라우트를 통해 저장 (서버 사이드에서 처리)
      const response = await fetch('/api/guide', {
        method: 'POST',
        headers,
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({
          id: guideData.id,
          title: guideData.title || 'OKAI 가이드',
          welcome_title: guideData.welcome_title || '환영합니다!',
          welcome_content: guideData.welcome_content || '',
          features: guideData.features || [],
          getting_started: guideData.getting_started || [],
          tips: guideData.tips || [],
        }),
      })

      const result = await response.json()
      console.log('[가이드 저장] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[가이드 저장] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`저장 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      // 성공 시 데이터 다시 불러오기
      await fetchGuideContent()
      alert('가이드 내용이 저장되었습니다!')
    } catch (error: any) {
      console.error('[가이드 저장] 예외 발생:', error)
      alert('저장 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
    } finally {
      setGuideSaving(false)
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
      console.log('[사용자 수정] 시작 - 사용자 ID:', userId)

      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // API 라우트를 통해 수정 (서버 사이드에서 처리)
      const response = await fetch('/api/admin/update-user', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          userId,
          name: editFormData.name || null,
          employee_number: editFormData.employee_number || null,
          company: editFormData.company || null,
          team: editFormData.team || null,
          position: editFormData.position || null,
        }),
      })

      const result = await response.json()
      console.log('[사용자 수정] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[사용자 수정] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`수정 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      alert('사용자 정보가 수정되었습니다.')
      setShowEditModal(false)
      setEditFormData({})
      setSelectedUsers(new Set())
      fetchAllUsers()
    } catch (error: any) {
      console.error('[사용자 수정] 예외 발생:', error)
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
      console.log('[CoP 수정] 시작 - CoP ID:', copId)

      // 세션 토큰 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // API 라우트를 통해 수정 (서버 사이드에서 처리)
      const response = await fetch('/api/admin/update-cop', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          copId,
          name: editFormData.name || '',
          description: editFormData.description || null,
          max_members: editFormData.max_members || 0,
          activity_plan: editFormData.activity_plan || null,
          ai_tools: editFormData.ai_tools || null,
        }),
      })

      const result = await response.json()
      console.log('[CoP 수정] 응답:', { status: response.status, result })

      if (!response.ok) {
        console.error('[CoP 수정] 오류 상세:', {
          status: response.status,
          error: result.error,
          details: result.details
        })
        alert(`수정 실패: ${result.error}\n${result.details || ''}`)
        return
      }

      alert('CoP 정보가 수정되었습니다.')
      setShowEditModal(false)
      setEditFormData({})
      setSelectedCops(new Set())
      fetchAllCops()
    } catch (error: any) {
      console.error('[CoP 수정] 예외 발생:', error)
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
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'guide'
                  ? 'border-ok-primary text-ok-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              가이드 관리
            </button>
          </div>
        </div>

        {activeTab !== 'guide' && (
          <>
            <p className="text-gray-600 mb-4">
              {activeTab === 'users' ? '사용자 관리' : 'CoP 관리'}
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
      ) : activeTab === 'guide' ? (
        <div className="bg-white rounded-2xl shadow-md p-8">
          {guideLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : guideData ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={guideData.title || ''}
                  onChange={(e) => setGuideData({ ...guideData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                  placeholder="OKAI 가이드"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  환영 제목
                </label>
                <input
                  type="text"
                  value={guideData.welcome_title || ''}
                  onChange={(e) => setGuideData({ ...guideData, welcome_title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                  placeholder="환영합니다!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  환영 내용
                </label>
                <textarea
                  value={guideData.welcome_content || ''}
                  onChange={(e) => setGuideData({ ...guideData, welcome_content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20"
                  placeholder="OKAI 플랫폼에 오신 것을 환영합니다..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주요 기능
                </label>
                <div className="space-y-3">
                  {(guideData.features || []).map((feature: any, index: number) => (
                    <div key={index} className="border-2 border-gray-200 rounded-xl p-4">
                      <div className="grid grid-cols-12 gap-3 mb-3">
                        <div className="col-span-1">
                          <input
                            type="text"
                            value={feature.icon || ''}
                            onChange={(e) => {
                              const newFeatures = [...(guideData.features || [])]
                              newFeatures[index] = { ...feature, icon: e.target.value }
                              setGuideData({ ...guideData, features: newFeatures })
                            }}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-center"
                            placeholder="📰"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={feature.title || ''}
                            onChange={(e) => {
                              const newFeatures = [...(guideData.features || [])]
                              newFeatures[index] = { ...feature, title: e.target.value }
                              setGuideData({ ...guideData, features: newFeatures })
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="기능 제목"
                          />
                        </div>
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={feature.description || ''}
                            onChange={(e) => {
                              const newFeatures = [...(guideData.features || [])]
                              newFeatures[index] = { ...feature, description: e.target.value }
                              setGuideData({ ...guideData, features: newFeatures })
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="기능 설명"
                          />
                        </div>
                        <div className="col-span-1">
                          <button
                            onClick={() => {
                              const newFeatures = (guideData.features || []).filter((_: any, i: number) => i !== index)
                              setGuideData({ ...guideData, features: newFeatures })
                            }}
                            className="w-full px-2 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newFeatures = [...(guideData.features || []), { icon: '', title: '', description: '' }]
                      setGuideData({ ...guideData, features: newFeatures })
                    }}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-ok-primary hover:text-ok-primary transition-colors"
                  >
                    + 기능 추가
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작하기
                </label>
                <div className="space-y-2">
                  {(guideData.getting_started || []).map((step: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...(guideData.getting_started || [])]
                          newSteps[index] = e.target.value
                          setGuideData({ ...guideData, getting_started: newSteps })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder={`단계 ${index + 1}`}
                      />
                      <button
                        onClick={() => {
                          const newSteps = (guideData.getting_started || []).filter((_: string, i: number) => i !== index)
                          setGuideData({ ...guideData, getting_started: newSteps })
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newSteps = [...(guideData.getting_started || []), '']
                      setGuideData({ ...guideData, getting_started: newSteps })
                    }}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-ok-primary hover:text-ok-primary transition-colors"
                  >
                    + 단계 추가
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  팁
                </label>
                <div className="space-y-2">
                  {(guideData.tips || []).map((tip: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tip}
                        onChange={(e) => {
                          const newTips = [...(guideData.tips || [])]
                          newTips[index] = e.target.value
                          setGuideData({ ...guideData, tips: newTips })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder={`팁 ${index + 1}`}
                      />
                      <button
                        onClick={() => {
                          const newTips = (guideData.tips || []).filter((_: string, i: number) => i !== index)
                          setGuideData({ ...guideData, tips: newTips })
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newTips = [...(guideData.tips || []), '']
                      setGuideData({ ...guideData, tips: newTips })
                    }}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-ok-primary hover:text-ok-primary transition-colors"
                  >
                    + 팁 추가
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={handleSaveGuide}
                  disabled={guideSaving}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                    guideSaving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-ok-primary text-white hover:bg-ok-dark'
                  }`}
                >
                  {guideSaving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">데이터를 불러올 수 없습니다.</div>
          )}
        </div>
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
    </div>
  )
}
