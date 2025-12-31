import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostEditor from '@/components/post/PostEditor'

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !post) {
    notFound()
  }

  if (post.user_id !== user.id) {
    redirect(`/post/${params.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">게시글 수정</h1>
      <PostEditor post={post} />
    </div>
  )
}
