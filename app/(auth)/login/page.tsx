import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'
import YutmanCharacter from '@/components/ui/YutmanCharacter'

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* 왼쪽: 로그인 폼 */}
      <div className="bg-white flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">로그인</h2>
            <p className="text-gray-600">
              또는{' '}
              <Link href="/signup" className="text-ok-primary hover:text-ok-dark font-semibold">
                회원가입
              </Link>
            </p>
          </div>
          <LoginForm />
        </div>
      </div>

      {/* 오른쪽: 그라데이션 배경 */}
      <div className="gradient-ok hidden lg:flex items-center justify-center px-16 relative overflow-hidden">
        <div className="relative z-10 text-white text-center flex flex-col items-center">
          {/* 읏맨 캐릭터 */}
          <div className="mb-6 animate-bounce-slow">
            <YutmanCharacter size={150} />
          </div>
          <h3 className="text-4xl font-bold mb-6">OK AI Community에<br />오신 것을 환영합니다</h3>
          <p className="text-lg opacity-90 mb-8">
            AI 개발자들과 함께<br />
            지식을 공유하고 성장하세요
          </p>
          <div className="space-y-4 w-full max-w-md">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="font-semibold mb-1">개발 일지</div>
              <div className="text-sm opacity-80">일상을 공유하고 소통하세요</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="font-semibold mb-1">AI News & Study</div>
              <div className="text-sm opacity-80">최신 정보와 학습 자료를 확인하세요</div>
            </div>
          </div>
        </div>
        {/* 장식 요소 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}
