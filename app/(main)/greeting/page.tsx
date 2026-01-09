'use client'

import { useAuth } from '@/hooks/useAuth'
import GreetingForm from '@/components/greeting/GreetingForm'
import GreetingList from '@/components/greeting/GreetingList'

export default function GreetingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 제목 및 설명 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>👋</span>
            <span>가입인사</span>
          </h1>
          <p className="text-gray-600 text-base">
            OKAI 커뮤니티에 오신 것을 환영합니다! 간단하게 가입인사를 남겨주세요.
          </p>
        </div>

        {/* 가입인사 작성 폼 (맨 위) */}
        {user ? (
          <div className="mb-8">
            <GreetingForm
              onSuccess={() => {
                // 성공 시 자동으로 목록이 새로고침됨
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-8">
            <p className="text-gray-600 mb-4">가입인사를 작성하려면 로그인이 필요합니다.</p>
            <a
              href="/login"
              className="inline-block bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
            >
              로그인하기
            </a>
          </div>
        )}

        {/* 가입인사 목록 (그 아래) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <GreetingList />
        </div>
      </div>
    </div>
  )
}
