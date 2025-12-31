import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostDetail from '@/components/post/PostDetail'
import CommentSection from '@/components/comment/CommentSection'

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select('*, user:profiles(email)')
    .eq('id', params.id)
    .single()

  if (error || !post) {
    notFound()
  }

  // 좋아요 수 조회
  const { count: likesCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', params.id)

  // 댓글 수 조회
  const { count: commentsCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', params.id)

  // 현재 사용자의 좋아요 상태 확인
  const { data: { user } } = await supabase.auth.getUser()
  let isLiked = false
  if (user) {
    const { data: like } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', params.id)
      .eq('user_id', user.id)
      .single()
    isLiked = !!like
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PostDetail
        post={{ ...post, likes_count: likesCount || 0, comments_count: commentsCount || 0 }}
        isLiked={isLiked}
        currentUserId={user?.id}
      />
      <CommentSection postId={params.id} />
    </div>
  )
}
