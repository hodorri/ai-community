import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length === 0) {
      return NextResponse.json({ 
        posts: [], 
        news: [] 
      })
    }

    const supabase = await createClient()

    // Posts 검색 (제목과 내용에서 검색)
    const searchPattern = `%${query}%`
    
    console.log('[검색 API] 검색 시작 - 검색어:', query, '패턴:', searchPattern)
    
    // 제목으로 검색
    const { data: postsByTitle, error: postsTitleError } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, user:profiles(email, nickname)')
      .ilike('title', searchPattern)
      .limit(20)

    // 내용으로 검색
    const { data: postsByContent, error: postsContentError } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, user:profiles(email, nickname)')
      .ilike('content', searchPattern)
      .limit(20)

    if (postsTitleError) {
      console.error('[검색 API] Posts 제목 검색 오류:', postsTitleError)
    }
    if (postsContentError) {
      console.error('[검색 API] Posts 내용 검색 오류:', postsContentError)
    }

    // 중복 제거 및 병합
    const allPosts = [...(postsByTitle || []), ...(postsByContent || [])]
    const uniquePostsMap = new Map()
    allPosts.forEach(post => {
      if (!uniquePostsMap.has(post.id)) {
        uniquePostsMap.set(post.id, post)
      }
    })
    const uniquePosts = Array.from(uniquePostsMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    // News 검색 (제목과 내용에서 검색)
    const { data: newsByTitle, error: newsTitleError } = await supabase
      .from('news')
      .select('id, title, content, created_at, user_id, author_name, source_site')
      .ilike('title', searchPattern)
      .limit(20)

    const { data: newsByContent, error: newsContentError } = await supabase
      .from('news')
      .select('id, title, content, created_at, user_id, author_name, source_site')
      .ilike('content', searchPattern)
      .limit(20)

    if (newsTitleError) {
      console.error('[검색 API] News 제목 검색 오류:', newsTitleError)
    }
    if (newsContentError) {
      console.error('[검색 API] News 내용 검색 오류:', newsContentError)
    }

    // 중복 제거 및 병합
    const allNews = [...(newsByTitle || []), ...(newsByContent || [])]
    const uniqueNewsMap = new Map()
    allNews.forEach(news => {
      if (!uniqueNewsMap.has(news.id)) {
        uniqueNewsMap.set(news.id, news)
      }
    })
    const uniqueNews = Array.from(uniqueNewsMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    // 디버깅 정보
    console.log('[검색 API] 검색어:', query)
    console.log('[검색 API] Posts 결과:', uniquePosts.length, '개')
    console.log('[검색 API] News 결과:', uniqueNews.length, '개')

    return NextResponse.json({
      posts: uniquePosts || [],
      news: uniqueNews || [],
    })
  } catch (error) {
    console.error('[검색 API] 예외 발생:', error)
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
