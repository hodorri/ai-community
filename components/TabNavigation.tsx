'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

type TabType = 'all' | 'diary' | 'news' | 'cases' | 'study'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { user } = useAuth()

  const tabs = [
    { id: 'all' as TabType, label: '전체', showOnlyWhenLoggedIn: true },
    { id: 'news' as TabType, label: '최신 AI 소식', showOnlyWhenLoggedIn: false },
    { id: 'diary' as TabType, label: 'AI 활용 사례', showOnlyWhenLoggedIn: false },
    { id: 'study' as TabType, label: 'AI CoP', showOnlyWhenLoggedIn: false },
  ]

  const visibleTabs = tabs.filter(tab => !tab.showOnlyWhenLoggedIn || user)

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-ok-primary text-ok-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {user && (activeTab === 'news' || activeTab === 'diary') && (
            <Link
              href={activeTab === 'news' ? '/news/new' : '/post/new'}
              className="ml-4 bg-ok-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-ok-dark transition-colors shadow-md hover:shadow-lg"
            >
              글쓰기
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
