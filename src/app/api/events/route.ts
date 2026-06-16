import { NextResponse } from 'next/server'
import { getActiveEvents, getEvents } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'

  try {
    if (all) {
      const payload = getAuthPayload()
      if (!payload || !requireRole('admin')(payload)) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      const events = await getEvents()
      return NextResponse.json<ApiResponse>({ success: true, data: events })
    }

    const events = await getActiveEvents()
    return NextResponse.json<ApiResponse>({ success: true, data: events })
  } catch (err) {
    console.error('GET /api/events error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch events' }, { status: 500 })
  }
}
