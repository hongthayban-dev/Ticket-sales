import { NextResponse } from 'next/server'
import { initializeSheets } from '@/lib/sheets'
import type { ApiResponse } from '@/types'

// One-time setup endpoint to initialize sheet headers
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.SUPER_ADMIN_TOKEN) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await initializeSheets()
    return NextResponse.json<ApiResponse>({ success: true, message: 'Sheets initialized' })
  } catch (err) {
    console.error('Init error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: String(err) }, { status: 500 })
  }
}
