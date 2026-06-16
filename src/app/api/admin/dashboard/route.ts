import { NextResponse } from 'next/server'
import { getRegistrations, getCheckIns, getTicketTypes } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse, DashboardStats } from '@/types'

export async function GET(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const event_id = searchParams.get('event_id') || undefined

  try {
    const [registrations, checkIns] = await Promise.all([
      getRegistrations(event_id),
      getCheckIns(event_id),
    ])

    const stats: DashboardStats = {
      total_registrations: registrations.length,
      paid_registrations: registrations.filter(r => r.payment_status === 'paid').length,
      pending_registrations: registrations.filter(r =>
        ['pending_payment', 'verifying'].includes(r.payment_status)
      ).length,
      rejected_registrations: registrations.filter(r => r.payment_status === 'rejected').length,
      total_revenue: registrations
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + r.total_amount, 0),
      checked_in: checkIns.length,
    }

    // Recent registrations (last 10)
    const recent = registrations.slice(0, 10)

    // Revenue by ticket type
    const revenueByType: Record<string, { name: string; count: number; revenue: number }> = {}
    registrations
      .filter(r => r.payment_status === 'paid')
      .forEach(r => {
        const key = r.ticket_type_name
        if (!revenueByType[key]) {
          revenueByType[key] = { name: key, count: 0, revenue: 0 }
        }
        revenueByType[key].count++
        revenueByType[key].revenue += r.total_amount
      })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { stats, recent, revenueByType: Object.values(revenueByType) },
    })
  } catch (err) {
    console.error('GET /api/admin/dashboard error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
