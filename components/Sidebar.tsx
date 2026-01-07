'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const menuItems = [
    { href: '/dashboard', label: '홈', icon: '🏠', tab: null },
    { href: '/dashboard?tab=news', label: '최신 AI 소식', icon: '📰', tab: 'news' },
    { href: '/dashboard?tab=diary', label: 'AI 개발일지', icon: '💡', tab: 'diary' },
    { href: '/dashboard?tab=study', label: 'AI CoP', icon: '🎓', tab: 'study' },
  ]

  const currentTab = searchParams.get('tab')

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            // 홈 메뉴는 tab 파라미터가 없을 때 활성화
            // 다른 메뉴는 해당 tab 파라미터가 일치할 때 활성화
            const isActive = item.tab === null 
              ? pathname === '/dashboard' && !currentTab
              : pathname === '/dashboard' && currentTab === item.tab
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-ok-primary/10 text-ok-primary'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
