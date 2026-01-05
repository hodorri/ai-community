import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsEditClient from '@/components/news/NewsEditClient'

interface NewsEditPageProps {
  params: Promise<{ id: string }>
}

export default async function NewsEditPage({ params }: NewsEditPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 뉴스 데이터만 조회 (인증/권한 체크는 클라이언트에서 처리)
  const { data: news, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !news) {
    redirect('/dashboard?tab=news')
  }

  return <NewsEditClient news={news} />
}
