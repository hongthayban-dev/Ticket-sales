import { NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET() {
  const payload = getAuthPayload()
  if (!payload) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      staff_id: payload.staff_id,
      staff_name: payload.staff_name,
      role: payload.role,
    },
  })
}
