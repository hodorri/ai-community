'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Inspiration {
  id: number
  author: string
  text: string
  icon: string
}

const dailyInspirations: Inspiration[] = [
  {
    id: 1,
    author: "Sam Altman",
    text: "모든 것이 작동하지 않는 것처럼 보일 때, 가장 중요한 것은 계속 나아가는 힘입니다.",
    icon: "🧠"
  },
  {
    id: 2,
    author: "Jensen Huang",
    text: "실패를 두려워하지 마세요. 대신 빨리 실패하고, 거기서 배우십시오.",
    icon: "💡"
  },
  {
    id: 3,
    author: "Andrej Karpathy",
    text: "코드 한 줄 한 줄이 당신의 사고를 형성합니다. 깔끔한 코드를 작성하세요.",
    icon: "⚡"
  },
  {
    id: 4,
    author: "Geoffrey Hinton",
    text: "AI는 도구일 뿐입니다. 진짜 힘은 그것을 어떻게 활용하는가에 있습니다.",
    icon: "🔮"
  },
  {
    id: 5,
    author: "Yann LeCun",
    text: "현재의 한계는 내일의 가능성입니다. 계속 배우고 실험하세요.",
    icon: "🌟"
  },
  {
    id: 6,
    author: "Demis Hassabis",
    text: "가장 복잡한 문제도 작은 단계로 나누면 풀 수 있습니다.",
    icon: "🎯"
  },
  {
    id: 7,
    author: "Fei-Fei Li",
    text: "AI는 인간의 삶을 더 나은 곳으로 만들기 위한 것입니다. 그 목표를 잊지 마세요.",
    icon: "💫"
  },
  {
    id: 8,
    author: "Andrew Ng",
    text: "학습 곡선은 가파르지만, 꾸준함이 당신을 정상에 도달시킬 것입니다.",
    icon: "🚀"
  },
  {
    id: 9,
    author: "Ilya Sutskever",
    text: "불가능해 보이는 것도 방법이 있습니다. 계속 탐구하세요.",
    icon: "🔬"
  },
  {
    id: 10,
    author: "Dario Amodei",
    text: "안전성과 혁신의 균형을 유지하는 것이 AI 개발자의 책임입니다.",
    icon: "🛡️"
  },
  {
    id: 11,
    author: "Daphne Koller",
    text: "데이터는 말을 합니다. 그것을 들어보세요.",
    icon: "📊"
  },
  {
    id: 12,
    author: "Jeff Dean",
    text: "확장 가능한 시스템을 만드는 것은 하루아침에 이뤄지지 않습니다. 인내심을 가지세요.",
    icon: "🏗️"
  },
  {
    id: 13,
    author: "Chris Manning",
    text: "언어를 이해하는 것은 AI의 핵심입니다. 계속 공부하세요.",
    icon: "📚"
  },
  {
    id: 14,
    author: "Yoshua Bengio",
    text: "이론과 실습의 균형이 진정한 전문가를 만듭니다.",
    icon: "⚖️"
  },
  {
    id: 15,
    author: "Ian Goodfellow",
    text: "경쟁은 발전의 촉진제입니다. 다른 개발자들과 함께 성장하세요.",
    icon: "🤝"
  }
]

// 오늘 날짜 기반으로 동일한 메시지를 반환하는 함수
function getTodayInspiration(): Inspiration {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  const index = dayOfYear % dailyInspirations.length
  return dailyInspirations[index]
}

interface AIInspirationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIInspirationModal({ isOpen, onClose }: AIInspirationModalProps) {
  const [inspiration, setInspiration] = useState<Inspiration | null>(null)

  useEffect(() => {
    if (isOpen) {
      // 오늘의 메시지 가져오기 (매일 동일한 메시지)
      const todayInspiration = getTodayInspiration()
      setInspiration(todayInspiration)
    }
  }, [isOpen])

  if (!isOpen || !inspiration) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 relative transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 이미지 */}
        <div className="text-center mb-4">
          <div className="relative w-32 h-32 mx-auto mb-2 flex items-center justify-center">
            <img
              src="/inspiration.png"
              alt="AI Inspiration"
              className="object-contain max-w-full max-h-full animate-float"
              style={{
                width: '128px',
                height: 'auto',
                mixBlendMode: 'multiply',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
              }}
              onError={(e) => {
                // 이미지 로드 실패 시 이모지 표시
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.parentElement?.querySelector('.fallback-icon') as HTMLElement
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div className="fallback-icon text-6xl absolute inset-0 flex items-center justify-center" style={{ display: 'none' }}>
              {inspiration.icon}
            </div>
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
          오늘의 AI Inspiration 도착!
        </h2>
        <div className="text-center mb-8">
          <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded">beta</span>
        </div>

        {/* 메시지 */}
        <div className="bg-white/70 rounded-xl p-8 mb-6 shadow-inner">
          <p 
            className="text-lg text-gray-900 text-center leading-loose font-normal tracking-wide" 
            style={{ 
              wordBreak: 'keep-all',
              wordWrap: 'break-word',
              hyphens: 'none'
            }}
          >
            {inspiration.text}
          </p>
          <p className="text-base text-gray-700 text-center mt-6 font-semibold">
            — {inspiration.author}
          </p>
        </div>

        {/* 하단 메시지 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span>🍀</span>
            <span>내일 또 새로운 영감이 찾아와요!</span>
          </div>
        </div>
      </div>
    </div>
  )
}
