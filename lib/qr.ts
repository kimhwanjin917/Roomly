import * as jwt from 'jsonwebtoken'
import { appUrl, type StaffRole } from '@/lib/constants'

/**
 * 직원 QR 로그인 토큰 — Supabase JWT 형식을 흉내낸 자체 서명 토큰.
 * qr_version이 staff 레코드와 일치할 때만 유효하므로, 버전을 올리면 기존 QR이 무효화된다.
 */

export interface QrStaff {
  id: string
  auth_id: string
  qr_version: number
  role?: string | null
}

export function signWorkerToken(staff: QrStaff, hotelId: string): string {
  const workerRole: StaffRole = staff.role === 'dirty' ? 'dirty' : 'housekeeping'

  return jwt.sign(
    {
      sub: staff.auth_id,
      role: 'authenticated',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      app_metadata: {
        hotel_id: hotelId,
        role: 'worker',
        worker_role: workerRole,
        staff_id: staff.id,
        qr_version: staff.qr_version,
      },
    },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '30d' },
  )
}

/** QR 코드에 인코딩할 로그인 URL */
export function buildQrUrl(staff: QrStaff, hotelId: string): string {
  return `${appUrl()}/api/auth/qr?token=${signWorkerToken(staff, hotelId)}`
}
