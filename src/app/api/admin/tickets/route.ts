import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getTicketTypes, createTicketType, updateTicketType, createAuditLog } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const event_id = searchParams.get('event_id') || ''

  try {
    const tickets = await getTicketTypes(event_id)
    return NextResponse.json<ApiResponse>({ success: true, data: tickets })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const ticket = {
      ticket_id: uuidv4(),
      event_id: body.event_id,
      ticket_type: body.ticket_type || body.ticket_name,
      ticket_name: body.ticket_name,
      ticket_price: Number(body.ticket_price) || 0,
      ticket_quota: Number(body.ticket_quota) || 0,
      ticket_sold: 0,
      ticket_remaining: Number(body.ticket_quota) || 0,
      ticket_color: body.ticket_color || '#2563eb',
      ticket_description: body.ticket_description || '',
      status: 'active' as const,
      sort_order: Number(body.sort_order) || 0,
    }

    await createTicketType(ticket)
    await createAuditLog({
      action: 'TICKET_TYPE_CREATED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'ticket',
      target_id: ticket.ticket_id,
      details: `Name: ${ticket.ticket_name}, Price: ${ticket.ticket_price}`,
    })

    return NextResponse.json<ApiResponse>({ success: true, data: ticket, message: 'สร้างประเภทบัตรสำเร็จ' })
  } catch (err) {
    console.error('POST /api/admin/tickets error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { ticket_id, ...updates } = await request.json()
    await updateTicketType(ticket_id, updates)
    return NextResponse.json<ApiResponse>({ success: true, message: 'อัปเดตบัตรสำเร็จ' })
  } catch (err) {
    console.error('PUT /api/admin/tickets error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
