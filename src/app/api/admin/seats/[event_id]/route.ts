import { NextResponse } from 'next/server'
import { getAuthPayload, requireRole } from '@/lib/auth'
import { getSeats, deleteEventSeats, batchCreateSeats, getEventById } from '@/lib/sheets'
import type { ApiResponse, Seat } from '@/types'

export async function GET(req: Request, { params }: { params: { event_id: string } }) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('staff')(payload))
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const seats = await getSeats(params.event_id)
    return NextResponse.json<ApiResponse>({ success: true, data: seats })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to load seats' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { event_id: string } }) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload))
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { seats }: { seats: Seat[] } = await req.json()
    if (!Array.isArray(seats))
      return NextResponse.json<ApiResponse>({ success: false, error: 'seats array required' }, { status: 400 })

    const event = await getEventById(params.event_id)
    if (!event)
      return NextResponse.json<ApiResponse>({ success: false, error: 'Event not found' }, { status: 404 })

    // Replace all seats for this event
    await deleteEventSeats(params.event_id)
    await batchCreateSeats(seats)

    return NextResponse.json<ApiResponse>({ success: true, data: { count: seats.length }, message: `บันทึกที่นั่ง ${seats.length} ที่เรียบร้อย` })
  } catch (err) {
    console.error('POST /api/admin/seats error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to save seats' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { event_id: string } }) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload))
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteEventSeats(params.event_id)
    return NextResponse.json<ApiResponse>({ success: true, message: 'ลบที่นั่งทั้งหมดแล้ว' })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to delete seats' }, { status: 500 })
  }
}
