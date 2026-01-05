import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditPostClient from '@/components/post/EditPostClient'

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // 게시글 데이터만 조회 (인증/권한 체크는 클라이언트에서 처리)
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !post) {
    notFound()
  }

  return <EditPostClient post={post} />
}
