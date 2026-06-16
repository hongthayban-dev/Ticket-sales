import { NextResponse } from 'next/server'
import { getRegistrations, getPayments } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const event_id = searchParams.get('event_id') || undefined
  const status = searchParams.get('status') || undefined

  try {
    const [registrations, payments] = await Promise.all([
      getRegistrations(event_id),
      getPayments(event_id),
    ])

    // Merge registration + payment data
    const paymentMap = new Map(payments.map(p => [p.reg_id, p]))
    let merged = registrations.map(reg => ({
      ...reg,
      payment: paymentMap.get(reg.reg_id),
    }))

    // Filter by status
    if (status) {
      merged = merged.filter(r => r.payment_status === status)
    }

    return NextResponse.json<ApiResponse>({ success: true, data: merged })
  } catch (err) {
    console.error('GET /api/admin/payments error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch payments' }, { status: 500 })
  }
}
