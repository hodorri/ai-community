import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditPostClient from '@/components/post/EditPostClient'

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

  return <EditPostClient post={post} />
}
