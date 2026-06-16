import { NextResponse } from 'next/server'
import { getRegistrations } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const event_id = searchParams.get('event_id') || undefined

  try {
    const registrations = await getRegistrations(event_id)
    return NextResponse.json<ApiResponse>({ success: true, data: registrations })
  } catch (err) {
    console.error('GET /api/admin/registrations error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch registrations' }, { status: 500 })
  }
}
