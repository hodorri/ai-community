import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostEditor from '@/components/post/PostEditor'

export default async function NewPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">새 게시글 작성</h1>
      <PostEditor />
    </div>
  )
}
