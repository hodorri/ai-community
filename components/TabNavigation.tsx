'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

type TabType = 'all' | 'guide' | 'diary' | 'news' | 'cases' | 'study'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { user } = useAuth()

  const tabs = [
    { id: 'all' as TabType, label: '전체', showOnlyWhenLoggedIn: true },
    { id: 'guide' as TabType, label: 'OKAI 가이드', showOnlyWhenLoggedIn: false },
    { id: 'news' as TabType, label: '최신 AI 소식', showOnlyWhenLoggedIn: false },
    { id: 'cases' as TabType, label: 'AI 활용사례', showOnlyWhenLoggedIn: false },
    { id: 'diary' as TabType, label: 'AI 개발일지', showOnlyWhenLoggedIn: false },
    { id: 'study' as TabType, label: 'AI CoP', showOnlyWhenLoggedIn: false },
  ]

  const visibleTabs = tabs.filter(tab => !tab.showOnlyWhenLoggedIn || user)

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-8 h-full">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  px-1 border-b-2 font-medium text-sm transition-colors h-full flex items-center
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
