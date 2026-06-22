import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Roomly</h1>
        <p className="text-sm text-slate-500 mb-10">하우스키핑 관리 시스템</p>

        <div className="mb-8">
          <p className="text-6xl font-bold text-blue-600 mb-4">404</p>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-sm text-slate-500">
            요청하신 페이지가 존재하지 않습니다
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
