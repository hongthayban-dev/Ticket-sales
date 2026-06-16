import { NextResponse } from 'next/server'
import { getEventById, getTicketTypes, getSeats } from '@/lib/sheets'
import type { ApiResponse } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEventById(params.id)
    if (!event) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Event not found' }, { status: 404 })
    }

    const [ticketTypes, seats] = await Promise.all([
      getTicketTypes(params.id),
      event.ticket_mode === 'seat_map' ? getSeats(params.id) : Promise.resolve([]),
    ])

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { event, ticketTypes, seats },
    })
  } catch (err) {
    console.error('GET /api/events/[id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch event' }, { status: 500 })
  }
}
