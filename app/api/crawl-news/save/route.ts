import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CrawledNewsItem } from '../route'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 관리자 확인
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { newsItems }: { newsItems: CrawledNewsItem[] } = body

    if (!newsItems || !Array.isArray(newsItems)) {
      return NextResponse.json({ error: '뉴스 항목이 필요합니다.' }, { status: 400 })
    }

    console.log(`[크롤링 저장] ${newsItems.length}개 뉴스 저장 시작`)

    // 선택한 뉴스 저장
    const savedNews = []
    for (const newsItem of newsItems) {
      // 중복 체크
      const { data: existing } = await supabase
        .from('news')
        .select('id')
        .eq('source_url', newsItem.sourceUrl)
        .maybeSingle()

      if (!existing) {
        // 새로운 뉴스 저장
        const { data, error } = await supabase
          .from('news')
          .insert({
            title: newsItem.title,
            content: newsItem.content,
            source_url: newsItem.sourceUrl,
            source_site: newsItem.sourceSite,
            author_name: newsItem.authorName || null,
            image_url: newsItem.imageUrl || null,
            published_at: newsItem.publishedAt || new Date().toISOString(),
            is_manual: false,
            is_pinned: false,
          })
          .select()
          .single()

        if (!error && data) {
          savedNews.push(data)
        } else {
          console.error(`[크롤링 저장] 뉴스 저장 실패:`, error)
        }
      }
    }

    console.log(`[크롤링 저장] ${savedNews.length}개 뉴스 저장 완료`)

    return NextResponse.json({
      success: true,
      saved: savedNews.length,
      skipped: newsItems.length - savedNews.length,
    })
  } catch (error) {
    console.error('[크롤링 저장] 오류:', error)
    return NextResponse.json(
      { error: '뉴스 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
