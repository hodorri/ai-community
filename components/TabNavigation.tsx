'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

type TabType = 'all' | 'notice' | 'guide' | 'greeting' | 'diary' | 'news' | 'cases' | 'study' | 'cop-log' | 'engineer' | 'activity'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { user } = useAuth()

  const tabs = [
    { id: 'all' as TabType, label: '전체', showOnlyWhenLoggedIn: true },
    { id: 'guide' as TabType, label: 'OKAI 가이드', showOnlyWhenLoggedIn: false },
    { id: 'engineer' as TabType, label: 'AI Engineer', showOnlyWhenLoggedIn: false },
    { id: 'notice' as TabType, label: '공지사항', showOnlyWhenLoggedIn: false },
    { id: 'greeting' as TabType, label: '가입인사', showOnlyWhenLoggedIn: false },
    { id: 'news' as TabType, label: 'AI News', showOnlyWhenLoggedIn: false },
    { id: 'cases' as TabType, label: 'AI 활용사례', showOnlyWhenLoggedIn: false },
    { id: 'diary' as TabType, label: 'AI 개발일지', showOnlyWhenLoggedIn: false },
    { id: 'study' as TabType, label: 'AI CoP', showOnlyWhenLoggedIn: false },
    { id: 'cop-log' as TabType, label: 'CoP 활동일지', showOnlyWhenLoggedIn: false },
    { id: 'activity' as TabType, label: '나의 활동', showOnlyWhenLoggedIn: true },
  ]

  const visibleTabs = tabs.filter(tab => !tab.showOnlyWhenLoggedIn || user)

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center h-12 sm:h-16 min-w-max gap-1 sm:gap-6">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors h-full flex items-center whitespace-nowrap flex-shrink-0
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
        </div>
      </div>
    </nav>
  )
}
