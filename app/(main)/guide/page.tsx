'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GuideContentData {
  id: string
  title: string
  welcome_title: string
  welcome_content: string
  features: Array<{
    icon: string
    title: string
    description: string
  }>
  getting_started: string[]
  tips: string[]
}

function GuideContent() {
  const [guideData, setGuideData] = useState<GuideContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchGuideContent() {
      try {
        const { data, error } = await supabase
          .from('guide_content')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('가이드 내용 불러오기 오류:', error)
          // 기본값 사용
          setGuideData({
            id: '',
            title: 'OKAI 가이드',
            welcome_title: '환영합니다!',
            welcome_content: 'OKAI 플랫폼에 오신 것을 환영합니다. 이 가이드를 통해 OKAI의 다양한 기능을 활용하는 방법을 알아보세요.',
            features: [
              { icon: '📰', title: '최신 AI 소식', description: '최신 AI 뉴스와 정보를 확인하고, 직접 뉴스를 작성하여 공유할 수 있습니다.' },
              { icon: '💡', title: 'AI 활용 사례', description: '실제 AI 활용 경험과 노하우를 공유하는 공간입니다.' },
              { icon: '🎓', title: 'AI CoP', description: 'AI 관련 커뮤니티 오브 프랙티스(CoP)를 만들고 참여하여 함께 학습하고 성장할 수 있습니다.' },
              { icon: '✨', title: '전체 피드', description: '로그인 후 모든 콘텐츠를 한눈에 볼 수 있는 통합 피드를 제공합니다.' }
            ],
            getting_started: [
              '회원가입 또는 로그인을 진행합니다.',
              '원하는 탭을 클릭하여 콘텐츠를 탐색합니다.',
              '글쓰기 버튼을 통해 자신의 경험과 지식을 공유합니다.',
              'AI CoP를 개설하거나 참여하여 커뮤니티 활동을 시작합니다.'
            ],
            tips: [
              '좋아요와 댓글을 통해 다른 사용자들과 소통해보세요.',
              '검색 기능을 활용하여 원하는 콘텐츠를 빠르게 찾을 수 있습니다.',
              '프로필 페이지에서 자신의 활동 내역을 확인할 수 있습니다.'
            ]
          })
        } else if (data) {
          setGuideData(data as GuideContentData)
        } else {
          // 데이터가 없으면 기본값 사용
          setGuideData({
            id: '',
            title: 'OKAI 가이드',
            welcome_title: '환영합니다!',
            welcome_content: 'OKAI 플랫폼에 오신 것을 환영합니다. 이 가이드를 통해 OKAI의 다양한 기능을 활용하는 방법을 알아보세요.',
            features: [],
            getting_started: [],
            tips: []
          })
        }
      } catch (error) {
        console.error('가이드 내용 불러오기 예외:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGuideContent()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!guideData) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12 text-gray-500">가이드 내용을 불러올 수 없습니다.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{guideData.title}</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">{guideData.welcome_title}</h2>
              <p className="text-gray-600 leading-relaxed">
                {guideData.welcome_content}
              </p>
            </section>

            {guideData.features && guideData.features.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">주요 기능</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {guideData.features.map((feature, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">
                        {feature.icon} {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {guideData.getting_started && guideData.getting_started.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">시작하기</h2>
                <ol className="list-decimal list-inside space-y-3 text-gray-600">
                  {guideData.getting_started.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              </section>
            )}

            {guideData.tips && guideData.tips.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">팁</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  {guideData.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩 중...</div>}>
      <GuideContent />
    </Suspense>
  )
}
