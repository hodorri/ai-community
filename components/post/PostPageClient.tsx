'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PostDetail from '@/components/post/PostDetail'
import CommentSection from '@/components/comment/CommentSection'
import type { Post } from '@/lib/types/database'

interface PostPageClientProps {
  postId: string
}

export default function PostPageClient({ postId }: PostPageClientProps) {
  const router = useRouter()
  const [post, setPost] = useState<Post & { user?: { email: string }, likes_count?: number, comments_count?: number } | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPost() {
      try {
        console.log('[PostPageClient] 게시글 조회 시작, postId:', postId)
        
        // 현재 사용자 확인
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id)

        // 게시글 조회 (조인 실패 시를 대비해 단순 조회로 시도)
        let postData: any = null
        let postError: any = null

        // 먼저 조인으로 시도
        const { data: joinedData, error: joinedError } = await supabase
          .from('posts')
          .select('*, user:profiles(email)')
          .eq('id', postId)
          .single()

        if (joinedError) {
          console.warn('[PostPageClient] 조인 조회 실패, 단순 조회로 재시도:', joinedError)
          // 조인 실패 시 단순 조회로 재시도
          const { data: simpleData, error: simpleError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single()

          if (simpleError || !simpleData) {
            console.error('[PostPageClient] 게시글 조회 실패:', simpleError)
            throw new Error(simpleError?.message || '게시글을 찾을 수 없습니다.')
          }

          postData = simpleData
          // 프로필 정보 별도 조회
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', simpleData.user_id)
            .maybeSingle() // .single() 대신 .maybeSingle() 사용

          postData.user = profile ? { email: profile.email } : { email: null }
        } else {
          postData = joinedData
        }

        if (!postData) {
          throw new Error('게시글을 찾을 수 없습니다.')
        }

        console.log('[PostPageClient] 게시글 조회 성공:', postData)

        // 좋아요 수 조회
        let likesCount = 0
        try {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId)
          likesCount = count || 0
        } catch (error) {
          console.warn('[PostPageClient] 좋아요 수 조회 실패:', error)
        }

        // 댓글 수 조회
        let commentsCount = 0
        try {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId)
          commentsCount = count || 0
        } catch (error) {
          console.warn('[PostPageClient] 댓글 수 조회 실패:', error)
        }

        // 현재 사용자의 좋아요 상태 확인
        let liked = false
        if (user) {
          try {
            const { data: like, error: likeError } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', postId)
              .eq('user_id', user.id)
              .maybeSingle() // .single() 대신 .maybeSingle() 사용 (없어도 에러 안남)
            
            if (likeError && likeError.code !== 'PGRST116') {
              // PGRST116은 "결과가 없음"을 의미하는 에러이므로 무시
              console.warn('[PostPageClient] 좋아요 상태 조회 실패:', likeError)
            } else {
              liked = !!like
            }
          } catch (error) {
            // 좋아요 상태 조회 실패는 무시 (에러가 아닌 경우도 있음)
            console.warn('[PostPageClient] 좋아요 상태 조회 실패:', error)
          }
        }

        setPost({
          ...postData,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        })
        setIsLiked(liked)
        setLoading(false) // 성공 시 로딩 종료
      } catch (error) {
        console.error('[PostPageClient] 게시글 로드 오류:', error)
        // 에러가 발생해도 일단 로딩을 멈추고 에러 메시지를 표시
        setLoading(false)
        // router.push는 하지 않고 에러 상태로 표시
      }
    }

    fetchPost()
  }, [postId, router, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!post && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-600 font-semibold">게시글을 찾을 수 없습니다.</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-ok-primary text-white rounded-lg hover:bg-ok-dark transition-colors"
        >
          대시보드로 돌아가기
        </button>
      </div>
    )
  }

  // post가 null이 아님이 보장됨 (위의 early return으로)
  if (!post) {
    return null
  }

  // 타입 단언: post는 이 시점에서 null이 아님
  const postData: Post & { user?: { email: string } } = {
    ...post,
    user: post.user ? { email: post.user.email } : undefined,
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <PostDetail
            post={postData}
            isLiked={isLiked}
            currentUserId={currentUserId}
          />
          <div className="px-6 sm:px-8 pb-6">
            <CommentSection postId={postId} />
          </div>
        </div>
      </div>
    </div>
  )
}
