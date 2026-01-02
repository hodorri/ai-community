'use client'

import { useState } from 'react'

interface ContactFormProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContactForm({ isOpen, onClose }: ContactFormProps) {
  const [name, setName] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    if (!employeeNumber.trim()) {
      setError('사번을 입력해주세요.')
      return
    }

    if (!content.trim()) {
      setError('문의 내용을 입력해주세요.')
      return
    }

    if (!contact.trim()) {
      setError('회신받을 연락처를 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          employeeNumber: employeeNumber.trim(),
          content: content.trim(),
          contact: contact.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '문의 전송에 실패했습니다.')
      }

      setSuccess(true)
      setName('')
      setEmployeeNumber('')
      setContent('')
      setContact('')

      // 2초 후 모달 닫기
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 전송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setEmployeeNumber('')
      setContent('')
      setContact('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">문의 남기기</h2>

        {success ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-green-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">문의가 전송되었습니다!</p>
            <p className="text-sm text-gray-600">관리자가 확인 후 회신드리겠습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
                placeholder="홍길동"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="employeeNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                사번 <span className="text-red-500">*</span>
              </label>
              <input
                id="employeeNumber"
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
                placeholder="12345"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                문의 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors resize-none"
                placeholder="문의하실 내용을 입력해주세요"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-semibold text-gray-700 mb-2">
                회신받을 연락처 <span className="text-red-500">*</span>
              </label>
              <input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
                placeholder="이메일 또는 전화번호"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-ok-primary text-white px-4 py-3 rounded-xl font-semibold hover:bg-ok-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              >
                {loading ? '전송 중...' : '문의 보내기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
