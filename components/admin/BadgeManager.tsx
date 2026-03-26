'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_BADGES, type BadgeInfo } from '@/lib/badges'
import Image from 'next/image'

interface UserWithBadges {
  id: string
  email: string | null
  name: string | null
  nickname: string | null
  avatar_url: string | null
  company: string | null
  team: string | null
  badges: string[]
}

export default function BadgeManager() {
  const [users, setUsers] = useState<UserWithBadges[]>([])
  const [badges, setBadges] = useState<BadgeInfo[]>(DEFAULT_BADGES)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserWithBadges | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeView, setActiveView] = useState<'users' | 'settings'>('users')
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const supabase = createClient()

  useEffect(() => { fetchBadgeDefinitions(); fetchUsers() }, [])

  async function fetchBadgeDefinitions() {
    const { data } = await supabase
      .from('badge_definitions')
      .select('*')
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) {
      setBadges(data.map((b: any) => ({ id: b.id, name: b.name, image: b.image_path })))
    }
  }

  async function handleUpdateBadgeName(badgeId: string) {
    if (!editName.trim()) return
    const { error } = await supabase
      .from('badge_definitions')
      .update({ name: editName.trim(), updated_at: new Date().toISOString() })
      .eq('id', badgeId)
    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      setEditingBadgeId(null)
      await fetchBadgeDefinitions()
    }
  }

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, nickname, avatar_url, company, team')
        .eq('status', 'approved')
        .order('name', { ascending: true })

      if (!profiles) { setLoading(false); return }

      const usersWithBadges = await Promise.all(
        profiles.map(async (p: any) => {
          const { data: badges } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', p.id)
          return { ...p, badges: (badges || []).map((b: any) => b.badge_id) }
        })
      )
      setUsers(usersWithBadges)
    } catch (error) {
      console.error('조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleBadge(userId: string, badgeId: string, hasIt: boolean) {
    setSaving(true)
    try {
      if (hasIt) {
        await supabase.from('user_badges').delete().eq('user_id', userId).eq('badge_id', badgeId)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('user_badges').insert({ user_id: userId, badge_id: badgeId, granted_by: user?.id })
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        return {
          ...u,
          badges: hasIt ? u.badges.filter(b => b !== badgeId) : [...u.badges, badgeId],
        }
      }))
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          badges: hasIt ? prev.badges.filter(b => b !== badgeId) : [...prev.badges, badgeId],
        } : null)
      }
    } catch (error) {
      console.error('뱃지 변경 오류:', error)
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) ||
           (u.nickname || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q) ||
           (u.company || '').toLowerCase().includes(q)
  })

  if (loading) return <div className="text-center py-8 text-gray-500">로딩 중...</div>

  return (
    <div>
      {/* 서브 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'users' ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          뱃지 부여
        </button>
        <button
          onClick={() => setActiveView('settings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'settings' ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          뱃지 이름 설정
        </button>
      </div>

      {/* 뱃지 이름 설정 */}
      {activeView === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">뱃지</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">이름</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase">수정</th>
              </tr>
            </thead>
            <tbody>
              {badges.map(b => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Image src={b.image} alt={b.name} width={40} height={40} className="object-contain" />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 font-mono">{b.id}</td>
                  <td className="py-3 px-4">
                    {editingBadgeId === b.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-48"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleUpdateBadgeName(b.id)}
                      />
                    ) : (
                      <span className="font-semibold text-gray-900 text-sm">{b.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingBadgeId === b.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleUpdateBadgeName(b.id)} className="text-ok-primary text-sm font-semibold">저장</button>
                        <button onClick={() => setEditingBadgeId(null)} className="text-gray-500 text-sm">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingBadgeId(b.id); setEditName(b.name) }} className="text-ok-primary hover:text-ok-dark text-sm font-semibold">수정</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'users' && !selectedUser ? (
        /* 유저 목록 */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm">유저를 선택해서 뱃지를 부여/해제하세요</p>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="이름/회사 검색"
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {filtered.map(u => {
              const displayName = u.nickname || u.name || u.email || '익명'
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="w-full flex items-center gap-3 py-3 px-4 border-b border-gray-100 hover:bg-gray-50 text-left transition-colors"
                >
                  {u.avatar_url ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={u.avatar_url} alt="" fill className="object-cover" sizes="32px" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{displayName}</div>
                    <div className="text-xs text-gray-500">{[u.company, u.team].filter(Boolean).join(' ') || u.email}</div>
                  </div>
                  {/* 보유 뱃지 미니 표시 */}
                  <div className="flex gap-1 flex-shrink-0">
                    {u.badges.map(bid => {
                      const badge = badges.find(b => b.id === bid)
                      return badge ? (
                        <Image key={bid} src={badge.image} alt={badge.name} width={24} height={24} className="object-contain" title={badge.name} />
                      ) : null
                    })}
                    {u.badges.length === 0 && <span className="text-xs text-gray-400">뱃지 없음</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : activeView === 'users' && selectedUser ? (
        /* 뱃지 부여/해제 */
        <div>
          <button
            onClick={() => setSelectedUser(null)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden">
                  <Image src={selectedUser.avatar_url} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-ok-primary flex items-center justify-center text-white font-bold text-xl">
                  {(selectedUser.nickname || selectedUser.name || '?').charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedUser.nickname || selectedUser.name}</h3>
                <p className="text-sm text-gray-500">{[selectedUser.company, selectedUser.team].filter(Boolean).join(' ')}</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-4">뱃지 관리</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge: BadgeInfo) => {
              const hasBadge = selectedUser.badges.includes(badge.id)
              return (
                <button
                  key={badge.id}
                  onClick={() => toggleBadge(selectedUser.id, badge.id, hasBadge)}
                  disabled={saving}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    hasBadge
                      ? 'border-ok-primary bg-ok-primary/5 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 opacity-50 hover:opacity-100'
                  }`}
                >
                  <Image src={badge.image} alt={badge.name} width={64} height={64} className="object-contain" />
                  <span className={`text-sm font-semibold ${hasBadge ? 'text-ok-primary' : 'text-gray-500'}`}>
                    {badge.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    hasBadge ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {hasBadge ? '부여됨' : '미부여'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
