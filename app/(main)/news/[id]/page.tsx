import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsPageClient from '@/components/news/NewsPageClient'

interface NewsDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 먼저 news 테이블에서 조회
  let { data: news, error: newsError } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  let newsWithUser = news
  let isFromSelectedNews = false

  // news 테이블에 없으면 selected_news 테이블에서 조회
  if (!news || newsError) {
    const { data: selectedNews, error: selectedError } = await supabase
      .from('selected_news')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (selectedError || !selectedNews) {
      redirect('/dashboard?tab=news')
      return
    }

    // selected_news를 News 타입으로 변환
    newsWithUser = {
      id: selectedNews.id,
      title: selectedNews.title,
      content: selectedNews.content || '',
      source_url: selectedNews.source_url || null,
      source_site: selectedNews.source_site || null,
      author_name: selectedNews.author_name || null,
      user_id: null,
      image_url: selectedNews.image_url || null,
      published_at: selectedNews.published_at || selectedNews.selected_at,
      is_manual: false,
      created_at: selectedNews.created_at,
      updated_at: selectedNews.updated_at,
      is_pinned: false,
    }
    isFromSelectedNews = true
  }

  // 수동 게시인 경우 프로필 정보 조회
  if (newsWithUser && !isFromSelectedNews && newsWithUser.is_manual && newsWithUser.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name, nickname, avatar_url, company, team, position')
      .eq('id', newsWithUser.user_id)
      .maybeSingle()

    newsWithUser = {
      ...newsWithUser,
      user: profile || null,
    }
  }

  return <NewsPageClient newsId={id} initialNews={newsWithUser} isFromSelectedNews={isFromSelectedNews} />
}
