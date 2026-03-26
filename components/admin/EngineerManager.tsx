'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface Engineer {
  id: string
  cohort: string
  employee_number: string | null
  name: string
  company: string | null
  department: string | null
  title: string | null
  position: string | null
  photo_url: string | null
  tier: string | null
}

const EMPTY_FORM = {
  cohort: '2기',
  employee_number: '',
  name: '',
  company: '',
  department: '',
  title: '',
  position: '',
  tier: '',
}

export default function EngineerManager() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCohort, setSelectedCohort] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 모달
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // 사진 업로드
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 선택 삭제
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  useEffect(() => { fetchEngineers() }, [])

  async function fetchEngineers() {
    setLoading(true)
    const { data } = await supabase
      .from('ai_engineers')
      .select('*')
      .order('cohort', { ascending: true })
      .order('name', { ascending: true })
    setEngineers(data || [])
    setLoading(false)
  }

  const cohorts = [...new Set(engineers.map(e => e.cohort))].sort()
  const filtered = engineers
    .filter(e => selectedCohort === 'all' || e.cohort === selectedCohort)
    .filter(e => !searchQuery || e.name.includes(searchQuery) || e.department?.includes(searchQuery) || e.company?.includes(searchQuery))

  function openAddModal() {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setPhotoPreview(null)
    setShowModal(true)
  }

  function openEditModal(eng: Engineer) {
    setEditingId(eng.id)
    setFormData({
      cohort: eng.cohort,
      employee_number: eng.employee_number || '',
      name: eng.name,
      company: eng.company || '',
      department: eng.department || '',
      title: eng.title || '',
      position: eng.position || '',
      tier: eng.tier || '',
    })
    setPhotoPreview(eng.photo_url || null)
    setShowModal(true)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('5MB 이하 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `engineer_${Date.now()}.${ext}`
      const filePath = `engineers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setPhotoPreview(urlData.publicUrl)
    } catch (error) {
      console.error('업로드 오류:', error)
      alert('사진 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.cohort.trim()) {
      alert('이름과 기수는 필수입니다.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        employee_number: formData.employee_number || null,
        company: formData.company || null,
        department: formData.department || null,
        title: formData.title || null,
        position: formData.position || null,
        tier: formData.tier || null,
        photo_url: photoPreview || null,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error } = await supabase.from('ai_engineers').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ai_engineers').insert(payload)
        if (error) throw error
      }

      setShowModal(false)
      await fetchEngineers()
    } catch (error: any) {
      alert('저장 실패: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`선택한 ${selected.size}명을 삭제하시겠습니까?`)) return

    setDeleting(true)
    try {
      const ids = Array.from(selected)
      const { error } = await supabase.from('ai_engineers').delete().in('id', ids)
      if (error) throw error
      setSelected(new Set())
      await fetchEngineers()
    } catch (error: any) {
      alert('삭제 실패: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(e => e.id)))
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">로딩 중...</div>

  return (
    <div>
      {/* 필터 + 검색 + 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedCohort('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedCohort === 'all' ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700'}`}>
            전체 ({engineers.length})
          </button>
          {cohorts.map(c => (
            <button key={c} onClick={() => setSelectedCohort(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedCohort === c ? 'bg-ok-primary text-white' : 'bg-gray-100 text-gray-700'}`}>
              {c} ({engineers.filter(e => e.cohort === c).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름/소속 검색"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40"
          />
          {selected.size > 0 && (
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-50">
              {deleting ? '삭제 중...' : `${selected.size}명 삭제`}
            </button>
          )}
          <button onClick={openAddModal} className="px-4 py-1.5 bg-ok-primary text-white rounded-lg text-sm font-semibold hover:bg-ok-dark">
            추가
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-3 text-center w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">사진</th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">이름</th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">기수</th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">회사</th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">소속</th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">호칭/직책</th>
              <th className="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase">수정</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(eng => {
              const initial = eng.name?.charAt(0) || '?'
              return (
                <tr key={eng.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-center">
                    <input type="checkbox" checked={selected.has(eng.id)} onChange={() => toggleSelect(eng.id)} className="rounded" />
                  </td>
                  <td className="py-2 px-3">
                    {eng.photo_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image src={eng.photo_url} alt="" fill className="object-cover" sizes="32px" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">{initial}</div>
                    )}
                  </td>
                  <td className="py-2 px-3 font-semibold text-gray-900 text-sm">{eng.name}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ok-primary/10 text-ok-primary">{eng.cohort}</span>
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-600">{eng.company || '-'}</td>
                  <td className="py-2 px-3 text-sm text-gray-600">{eng.department || '-'}</td>
                  <td className="py-2 px-3 text-sm text-gray-600">{[eng.title, eng.position].filter(Boolean).join(' / ') || '-'}</td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => openEditModal(eng)} className="text-ok-primary hover:text-ok-dark text-sm font-semibold">수정</button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'AI Engineer 수정' : 'AI Engineer 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 사진 */}
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={photoPreview} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl font-bold flex-shrink-0">
                    {formData.name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading ? '업로드 중...' : '사진 변경'}
                  </button>
                  {photoPreview && (
                    <button type="button" onClick={() => setPhotoPreview(null)} className="ml-2 text-xs text-red-500 hover:text-red-700">삭제</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">이름 *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">기수 *</label>
                  <select value={formData.cohort} onChange={e => setFormData({...formData, cohort: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="1기">1기</option>
                    <option value="2기">2기</option>
                    <option value="3기">3기</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">회사</label>
                  <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">소속</label>
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">호칭</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="예: 차장" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">직책</label>
                  <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="예: 팀장" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">사번</label>
                  <input type="text" value={formData.employee_number} onChange={e => setFormData({...formData, employee_number: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tier</label>
                  <input type="text" value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">취소</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-ok-primary text-white rounded-lg text-sm font-semibold hover:bg-ok-dark disabled:opacity-50">
                  {submitting ? '저장 중...' : editingId ? '수정하기' : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
