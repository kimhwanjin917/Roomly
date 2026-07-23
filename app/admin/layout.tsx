import AdminNav from '@/components/AdminNav'
import { C } from '@/lib/theme'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', 'Pretendard', -apple-system, sans-serif" }}
      className="md:pl-[220px]"
    >
      <AdminNav />
      {children}
    </div>
  )
}
