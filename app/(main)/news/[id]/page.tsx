import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsPageClient from '@/components/news/NewsPageClient'

interface NewsDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 뉴스 조회
  const { data: news, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !news) {
    redirect('/dashboard?tab=news')
  }

  // 수동 게시인 경우 프로필 정보 조회
  let newsWithUser = news
  if (news.is_manual && news.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name, nickname, avatar_url, company, team, position')
      .eq('id', news.user_id)
      .maybeSingle()

    newsWithUser = {
      ...news,
      user: profile || null,
    }
  }

  return <NewsPageClient newsId={id} initialNews={newsWithUser} />
}
