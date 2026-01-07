'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">오류 발생</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">심각한 오류가 발생했습니다</h2>
            <p className="text-gray-500 mb-8">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
            <button
              onClick={reset}
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
