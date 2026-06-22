export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 스켈레톤 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse hidden sm:block" />
            </div>
            <div className="flex gap-1">
              {[72, 60, 60, 44].map((w, i) => (
                <div key={i} className={`h-7 bg-gray-200 rounded-md animate-pulse`} style={{ width: w }} />
              ))}
            </div>
          </div>
          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* 필터 바 스켈레톤 */}
        <div className="flex gap-2 flex-wrap">
          {[80, 60, 60, 60, 80].map((w, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse" style={{ width: w }} />
          ))}
        </div>

        {/* 카드 6개 그리드 스켈레톤 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>

        {/* 추가 카드 행 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </main>
    </div>
  )
}
