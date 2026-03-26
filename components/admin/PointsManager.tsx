'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface UserWithPoints {
  id: string
  email: string | null
  name: string | null
  nickname: string | null
  company: string | null
  team: string | null
  position: string | null
  avatar_url: string | null
  totalPoints: number
}

interface PointSetting {
  id: string
  activity_type: string
  label: string
  points: number
  is_auto: boolean
}

interface PointRecord {
  id: string
  user_id: string
  points: number
  activity_type: string
  description: string | null
  reference_id: string | null
  created_at: string
}

export default function PointsManager() {
  const [users, setUsers] = useState<UserWithPoints[]>([])
  const [settings, setSettings] = useState<PointSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'ranking' | 'settings' | 'detail'>('ranking')
  const [selectedUser, setSelectedUser] = useState<UserWithPoints | null>(null)
  const [userPoints, setUserPoints] = useState<PointRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // 수동 부과 폼
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState({
    user_id: '',
    points: '',
    activity_type: 'manual',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // 설정 편집
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null)
  const [editPoints, setEditPoints] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // 유저 랭킹 조회
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, nickname, company, team, position, avatar_url')
        .eq('status', 'approved')

      if (profiles) {
        const usersWithPoints = await Promise.all(
          profiles.map(async (profile: any) => {
            const { data: points } = await supabase
              .from('activity_points')
              .select('points')
              .eq('user_id', profile.id)

            const totalPoints = (points || []).reduce((sum: number, p: any) => sum + p.points, 0)
            return { ...profile, totalPoints }
          })
        )
        usersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints)
        setUsers(usersWithPoints)
      }

      // 포인트 설정 조회
      const { data: settingsData } = await supabase
        .from('point_settings')
        .select('*')
        .order('activity_type')

      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserDetail(user: UserWithPoints) {
    setSelectedUser(user)
    setActiveView('detail')
    setDetailLoading(true)

    try {
      const { data } = await supabase
        .from('activity_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setUserPoints(data || [])
    } catch (error) {
      console.error('포인트 내역 조회 오류:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleAddPoints(e: React.FormEvent) {
    e.preventDefault()
    if (!addFormData.user_id || !addFormData.points) return

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('activity_points')
        .insert({
          user_id: addFormData.user_id,
          points: parseInt(addFormData.points),
          activity_type: addFormData.activity_type,
          description: addFormData.description || null,
          created_by: user.id,
        })

      if (error) throw error

      setShowAddForm(false)
      setAddFormData({ user_id: '', points: '', activity_type: 'manual', description: '' })
      await fetchData()

      // 상세보기 중이면 갱신
      if (selectedUser && selectedUser.id === addFormData.user_id) {
        await fetchUserDetail(selectedUser)
      }
    } catch (error) {
      console.error('포인트 부과 오류:', error)
      alert('포인트 부과에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeletePoint(pointId: string) {
    if (!confirm('이 포인트 내역을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('activity_points')
        .delete()
        .eq('id', pointId)

      if (error) throw error

      await fetchData()
      if (selectedUser) {
        await fetchUserDetail(selectedUser)
      }
    } catch (error) {
      console.error('포인트 삭제 오류:', error)
    }
  }

  async function handleUpdateSetting(settingId: string) {
    try {
      const { error } = await supabase
        .from('point_settings')
        .update({ points: parseInt(editPoints), updated_at: new Date().toISOString() })
        .eq('id', settingId)

      if (error) throw error

      setEditingSettingId(null)
      setEditPoints('')
      await fetchData()
    } catch (error) {
      console.error('설정 수정 오류:', error)
    }
  }

  const getActivityLabel = (type: string) => {
    const setting = settings.find(s => s.activity_type === type)
    return setting?.label || type
  }

  const getTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays < 1) return '오늘'
    if (diffDays < 30) return `${diffDays}일 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  return (
    <div>
      {/* 서브 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('ranking')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'ranking' ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          포인트 랭킹
        </button>
        <button
          onClick={() => setActiveView('settings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'settings' ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          포인트 설정
        </button>
        {selectedUser && (
          <button
            onClick={() => setActiveView('detail')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'detail' ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {selectedUser.nickname || selectedUser.name || '유저'} 상세
          </button>
        )}
      </div>

      {/* 포인트 랭킹 */}
      {activeView === 'ranking' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">승인된 유저의 활동 포인트 현황</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-ok-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ok-dark transition-colors"
            >
              포인트 수동 부과
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">순위</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">사용자</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">소속</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">포인트</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">상세</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => {
                  const displayName = u.nickname || u.name || u.email?.split('@')[0] || '익명'
                  const initial = displayName.charAt(0).toUpperCase()
                  return (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                              <Image src={u.avatar_url} alt={displayName} fill className="object-cover" sizes="32px" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {initial}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{displayName}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {[u.company, u.team].filter(Boolean).join(' ') || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-ok-primary text-lg">{u.totalPoints}</span>
                        <span className="text-gray-500 text-xs ml-1">점</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => fetchUserDetail(u)}
                          className="text-ok-primary hover:text-ok-dark text-sm font-semibold"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">승인된 유저가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 포인트 설정 */}
      {activeView === 'settings' && (
        <div>
          <p className="text-gray-600 mb-4">활동별 포인트 값을 설정합니다.</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">활동</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">유형</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">활동 코드</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">포인트</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">수정</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{s.label}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.is_auto ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {s.is_auto ? '자동' : '수동'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{s.activity_type}</td>
                    <td className="py-3 px-4 text-right">
                      {editingSettingId === s.id ? (
                        <input
                          type="number"
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-gray-900">{s.points}점</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {editingSettingId === s.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleUpdateSetting(s.id)}
                            className="text-ok-primary text-sm font-semibold"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => { setEditingSettingId(null); setEditPoints('') }}
                            className="text-gray-500 text-sm"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingSettingId(s.id); setEditPoints(String(s.points)) }}
                          className="text-ok-primary hover:text-ok-dark text-sm font-semibold"
                        >
                          수정
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 유저 상세 */}
      {activeView === 'detail' && selectedUser && (
        <div>
          <button
            onClick={() => setActiveView('ranking')}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            랭킹으로 돌아가기
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedUser.avatar_url ? (
                  <div className="relative w-14 h-14 rounded-full overflow-hidden">
                    <Image src={selectedUser.avatar_url} alt="" fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-ok-primary flex items-center justify-center text-white font-bold text-xl">
                    {(selectedUser.nickname || selectedUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedUser.nickname || selectedUser.name || selectedUser.email}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {[selectedUser.company, selectedUser.team, selectedUser.position].filter(Boolean).join(' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-ok-primary">{selectedUser.totalPoints}</div>
                <div className="text-sm text-gray-500">총 포인트</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">포인트 내역</h3>
            <button
              onClick={() => {
                setAddFormData({
                  ...addFormData,
                  user_id: selectedUser.id,
                })
                setShowAddForm(true)
              }}
              className="bg-ok-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ok-dark transition-colors"
            >
              포인트 부과
            </button>
          </div>

          {detailLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : userPoints.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-200 text-gray-500">
              포인트 내역이 없습니다.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {userPoints.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                      p.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.points > 0 ? '+' : ''}{p.points}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{getActivityLabel(p.activity_type)}</div>
                      {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{getTimeAgo(p.created_at)}</span>
                    <button
                      onClick={() => handleDeletePoint(p.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 수동 포인트 부과 모달 */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">포인트 수동 부과</h3>
            <form onSubmit={handleAddPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">대상 사용자</label>
                <select
                  value={addFormData.user_id}
                  onChange={(e) => setAddFormData({ ...addFormData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                >
                  <option value="">선택하세요</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nickname || u.name || u.email} ({[u.company, u.team].filter(Boolean).join(' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">활동 유형</label>
                <select
                  value={addFormData.activity_type}
                  onChange={(e) => setAddFormData({ ...addFormData, activity_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {settings.filter(s => !s.is_auto).map((s) => (
                    <option key={s.activity_type} value={s.activity_type}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">포인트 (음수로 차감 가능)</label>
                <input
                  type="number"
                  value={addFormData.points}
                  onChange={(e) => setAddFormData({ ...addFormData, points: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="예: 20 또는 -10"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">설명 (선택)</label>
                <input
                  type="text"
                  value={addFormData.description}
                  onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="예: 3월 사내강사 활동"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-ok-primary text-white rounded-lg text-sm font-semibold hover:bg-ok-dark disabled:opacity-50"
                >
                  {submitting ? '처리 중...' : '부과하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
