import SignupForm from '@/components/auth/SignupForm'
import Link from 'next/link'
import YutmanCharacter from '@/components/ui/YutmanCharacter'

export default function SignupPage() {
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
            <YutmanCharacter size={150} />
          </div>
          <h3 className="text-4xl font-bold mb-6">OK AI Community와<br />함께 시작하세요</h3>
          <p className="text-lg opacity-90 mb-8">
            무료로 가입하고<br />
            다양한 기능을 이용해보세요
          </p>
          <div className="space-y-4 w-full max-w-md">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="font-semibold mb-1">즉시 시작</div>
              <div className="text-sm opacity-80">이메일 인증 없이 바로 이용 가능</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="font-semibold mb-1">무료 이용</div>
              <div className="text-sm opacity-80">모든 기능을 무료로 사용하세요</div>
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
