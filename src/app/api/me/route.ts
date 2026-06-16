import { NextResponse } from 'next/server'
import { getRegistrationByLineUser } from '@/lib/sheets'
import type { ApiResponse } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const line_user_id = searchParams.get('line_user_id')
  const event_id = searchParams.get('event_id') || undefined

  if (!line_user_id) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'line_user_id required' }, { status: 400 })
  }

  try {
    const registrations = await getRegistrationByLineUser(line_user_id, event_id)
    return NextResponse.json<ApiResponse>({ success: true, data: registrations })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}
