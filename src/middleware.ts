import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = [
  '/admin/dashboard',
  '/admin/payments',
  '/admin/registrations',
  '/admin/events',
  '/admin/tickets',
  '/admin/staffs',
  '/admin/settings',
  '/admin/checkin',
]

// Decode JWT without verifying signature (Edge-compatible)
// Real verification happens in each API route
function decodeJwtPayload(token: string): { staff_id?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const payload = JSON.parse(json)
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('ts_admin_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const payload = decodeJwtPayload(token)
  if (!payload || !payload.staff_id || !payload.role) {
    const response = NextResponse.redirect(new URL('/admin', request.url))
    response.cookies.delete('ts_admin_token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
