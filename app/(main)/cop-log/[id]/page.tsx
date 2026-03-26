'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

export default function CopLogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [log, setLog] = useState<any>(null)
  const [copName, setCopName] = useState('')
  const [authorProfile, setAuthorProfile] = useState<any>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false)
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id || null)
        setCurrentUserEmail(user?.email || null)

        const { data: logData, error } = await supabase
          .from('cop_logs')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error || !logData) { setLoading(false); return }
        setLog(logData)

        // CoP 이름
        const { data: copData } = await supabase.from('cops').select('name').eq('id', logData.cop_id).single()
        if (copData) setCopName(copData.name)

        // 작성자 프로필
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, nickname, avatar_url, company, team, position')
          .eq('id', logData.user_id)
          .single()
        if (profile) setAuthorProfile(profile)

        // 좋아요
        const { count } = await supabase
          .from('cop_log_likes')
          .select('*', { count: 'exact', head: true })
          .eq('cop_log_id', params.id)
        setLikesCount(count || 0)

        if (user) {
          const { data: like } = await supabase
            .from('cop_log_likes')
            .select('id')
            .eq('cop_log_id', params.id)
            .eq('user_id', user.id)
            .maybeSingle()
          setIsLiked(!!like)
        }

        await fetchComments()
      } catch (error) {
        console.error('로드 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  async function fetchComments() {
    const { data } = await supabase
      .from('cop_log_comments')
      .select('*')
      .eq('cop_log_id', params.id)
      .order('created_at', { ascending: true })

    const withProfiles = await Promise.all(
      (data || []).map(async (c: any) => {
        const { data: p } = await supabase.from('profiles')
          .select('name, nickname, avatar_url')
          .eq('id', c.user_id).single()
        return { ...c, user: p || {} }
      })
    )
    setComments(withProfiles)
  }

  const handleLike = async () => {
    if (!currentUserId) { router.push('/login'); return }
    try {
      const { data: existing } = await supabase
        .from('cop_log_likes')
        .select('id')
        .eq('cop_log_id', params.id)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (existing) {
        await supabase.from('cop_log_likes').delete().eq('id', existing.id)
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        await supabase.from('cop_log_likes').insert({ cop_log_id: params.id, user_id: currentUserId })
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) { console.error('좋아요 오류:', error) }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUserId) return
    setSubmitting(true)
    try {
      await supabase.from('cop_log_comments').insert({
        cop_log_id: params.id,
        user_id: currentUserId,
        content: newComment.trim(),
      })
      setNewComment('')
      await fetchComments()
    } catch (error) { console.error('댓글 오류:', error) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await supabase.from('cop_logs').delete().eq('id', params.id)
      router.push('/dashboard?tab=cop-log')
    } catch (error) { alert('삭제 실패') }
  }

  const isOwner = currentUserId === log?.user_id
  const isAdmin = currentUserEmail === ADMIN_EMAIL

  const getTimeAgo = (dateString: string) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">로딩 중...</div></div>
  if (!log) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><div className="text-red-600 font-semibold">활동일지를 찾을 수 없습니다.</div></div>

  const displayName = authorProfile?.nickname || authorProfile?.name || '익명'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-w-3xl mx-auto p-6 sm:p-8">
          {/* 헤더 */}
          <div className="relative flex items-center justify-between mb-6">
            <button onClick={() => router.push('/dashboard?tab=cop-log')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm">목록으로</span>
            </button>
            <span className="text-sm text-gray-600">📁 {copName} 활동일지</span>
            {(isOwner || isAdmin) ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    {isOwner && <button onClick={() => { setShowMenu(false); router.push(`/cop-log/${params.id}/edit`) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg">수정하기</button>}
                    <button onClick={() => { setShowMenu(false); handleDelete() }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg">삭제하기</button>
                  </div>
                )}
              </div>
            ) : <div></div>}
          </div>

          {/* 작성자 */}
          <div className="flex items-center gap-3 mb-6">
            {authorProfile?.avatar_url ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden"><Image src={authorProfile.avatar_url} alt={displayName} fill className="object-cover" sizes="48px" /></div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-ok-primary flex items-center justify-center text-white font-semibold">{displayName.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{displayName}</div>
              {authorProfile && (authorProfile.company || authorProfile.team) && <div className="text-xs text-gray-500">{[authorProfile.company, authorProfile.team, authorProfile.position].filter(Boolean).join(' ')}</div>}
              <div className="text-sm text-gray-500">{getTimeAgo(log.created_at)}</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-8 text-gray-900">{log.title}</h1>
          <div className="prose prose-lg max-w-none mb-10 ProseMirror" style={{ maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: log.content }} />

          {/* 좋아요 */}
          <div className="flex items-center gap-4 pb-6 border-b">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
            <span className="text-gray-700 font-medium">{likesCount}</span>
            <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${isLiked ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
              <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="font-medium text-sm">좋아요</span>
            </button>
          </div>

          {/* 댓글 */}
          <div className="py-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">댓글 {comments.length}개</h3>
            {currentUserId && (
              <form onSubmit={handleComment} className="mb-6">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="댓글을 입력하세요" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary resize-none" rows={3} />
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={submitting || !newComment.trim()} className="px-4 py-2 bg-ok-primary text-white rounded-lg hover:bg-ok-dark disabled:opacity-50 font-semibold text-sm">{submitting ? '작성 중...' : '댓글 작성'}</button>
                </div>
              </form>
            )}
            <div className="space-y-4">
              {comments.map((c: any) => {
                const cName = c.user?.nickname || c.user?.name || '익명'
                return (
                  <div key={c.id} className="flex items-start gap-3">
                    {c.user?.avatar_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"><Image src={c.user.avatar_url} alt="" fill className="object-cover" sizes="32px" /></div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs flex-shrink-0">{cName.charAt(0)}</div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 text-sm">{cName}</span>
                        <span className="text-xs text-gray-500">{getTimeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-gray-800 text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                )
              })}
              {comments.length === 0 && <div className="text-center py-6 text-gray-500 text-sm">아직 댓글이 없습니다.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
