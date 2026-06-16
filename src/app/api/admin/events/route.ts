import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getEvents, createEvent, updateEvent, createAuditLog } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse, Event } from '@/types'

export async function GET() {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const events = await getEvents()
    return NextResponse.json<ApiResponse>({ success: true, data: events })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const event: Omit<Event, 'created_at' | 'updated_at'> = {
      event_id: uuidv4(),
      event_name: body.event_name,
      event_date: body.event_date,
      event_end_date: body.event_end_date,
      event_venue: body.event_venue,
      event_description: body.event_description,
      event_image: body.event_image,
      ticket_mode: body.ticket_mode || 'ticket_type',
      max_capacity: Number(body.max_capacity) || 0,
      status: body.status || 'draft',
      promptpay_number: body.promptpay_number || '',
      banner_url: body.banner_url,
      reservation_timeout: Number(body.reservation_timeout) || 15,
    }

    await createEvent(event)
    await createAuditLog({
      action: 'EVENT_CREATED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'event',
      target_id: event.event_id,
      details: `Name: ${event.event_name}`,
    })

    return NextResponse.json<ApiResponse>({ success: true, data: event, message: 'สร้างงานสำเร็จ' })
  } catch (err) {
    console.error('POST /api/admin/events error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to create event' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { event_id, ...updates } = await request.json()
    if (!event_id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'event_id required' }, { status: 400 })
    }

    await updateEvent(event_id, updates)
    await createAuditLog({
      action: 'EVENT_UPDATED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'event',
      target_id: event_id,
      details: JSON.stringify(updates),
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'อัปเดตงานสำเร็จ' })
  } catch (err) {
    console.error('PUT /api/admin/events error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to update event' }, { status: 500 })
  }
}
