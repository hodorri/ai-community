'use client'

import { useState } from 'react'
import SignupForm from '@/components/auth/SignupForm'
import Link from 'next/link'
import YutmanCharacter from '@/components/ui/YutmanCharacter'
import ContactForm from '@/components/ContactForm'

export default function SignupPage() {
  const [isContactOpen, setIsContactOpen] = useState(false)

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* 왼쪽: 회원가입 폼 */}
      <div className="bg-white flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md space-y-8">
        <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">회원가입</h2>
            <p className="text-gray-600">
            이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-ok-primary hover:text-ok-dark font-semibold">
              로그인
            </Link>
          </p>
        </div>
        <SignupForm />
      </div>
      </div>

      {/* 오른쪽: 그라데이션 배경 */}
      <div className="gradient-ok hidden lg:flex items-center justify-center px-16 relative overflow-hidden">
        <div className="relative z-10 text-white text-center flex flex-col items-center">
          {/* 읏맨 캐릭터 */}
          <div className="mb-6 animate-bounce-slow">
            <YutmanCharacter size={225} imagePath="/login.png" />
          </div>
          <h3 className="text-4xl font-bold mb-6">OK AI Community와<br />함께 시작하세요</h3>
          <div className="space-y-4 w-full max-w-md">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="font-semibold mb-1">문의사항</div>
              <div className="text-sm opacity-80 mb-3">
                로그인 오류나 기타 문의사항이 있으시면<br />
                관리자에게 연락해주세요
              </div>
              <button
                onClick={() => setIsContactOpen(true)}
                className="inline-block bg-white/30 hover:bg-white/40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors backdrop-blur-sm"
              >
                문의 남기기
              </button>
            </div>
          </div>
        </div>
        {/* 장식 요소 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* 문의 폼 모달 */}
      <ContactForm isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  )
}
