import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  getEventById, getTicketTypeById, getSeatById,
  createRegistration, updateSeatStatus, createPayment,
  releaseExpiredSeats, createAuditLog,
} from '@/lib/sheets'
import { generateRegId, addMinutes } from '@/lib/utils'
import type { ApiResponse, RegistrationFormData } from '@/types'

export async function POST(request: Request) {
  try {
    const body: RegistrationFormData & { line_user_id: string; line_display_name: string } = await request.json()

    const {
      event_id, line_user_id, line_display_name,
      customer_name, customer_nickname, customer_phone, customer_email,
      ticket_type_id, seat_id, quantity = 1,
    } = body

    if (!event_id || !line_user_id || !customer_name || !customer_phone || !customer_email) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    const event = await getEventById(event_id)
    if (!event) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบงานนี้' }, { status: 404 })
    }
    if (event.status !== 'active') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'งานนี้ปิดรับลงทะเบียนแล้ว' }, { status: 400 })
    }

    // Release expired seat reservations first
    await releaseExpiredSeats()

    let ticketTypeName = ''
    let ticketPrice = 0
    let resolvedSeatId = ''
    let seatNumber = ''
    let seatZone = ''

    if (event.ticket_mode === 'ticket_type') {
      if (!ticket_type_id) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาเลือกประเภทบัตร' }, { status: 400 })
      }
      const ticketType = await getTicketTypeById(ticket_type_id)
      if (!ticketType) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบประเภทบัตรนี้' }, { status: 404 })
      }
      if (ticketType.ticket_remaining < quantity) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'บัตรประเภทนี้หมดแล้ว' }, { status: 400 })
      }
      ticketTypeName = ticketType.ticket_name
      ticketPrice = ticketType.ticket_price

    } else if (event.ticket_mode === 'seat_map') {
      if (!seat_id) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาเลือกที่นั่ง' }, { status: 400 })
      }
      const seat = await getSeatById(seat_id)
      if (!seat) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบที่นั่งนี้' }, { status: 404 })
      }
      if (seat.status !== 'available') {
        return NextResponse.json<ApiResponse>({ success: false, error: 'ที่นั่งนี้ถูกจองแล้ว กรุณาเลือกที่นั่งอื่น' }, { status: 409 })
      }

      resolvedSeatId = seat_id
      seatNumber = seat.seat_number
      seatZone = seat.seat_zone
      ticketTypeName = seat.seat_type || seat.seat_zone
      ticketPrice = seat.price
    }

    const reg_id = generateRegId(event_id)
    const totalAmount = ticketPrice * quantity
    const now = new Date()
    const expiresAt = addMinutes(now, event.reservation_timeout || 15)

    // Create registration
    await createRegistration({
      reg_id,
      event_id,
      line_user_id,
      line_display_name,
      customer_name,
      customer_nickname: customer_nickname || '',
      customer_phone,
      customer_email,
      ticket_type_id: ticket_type_id || resolvedSeatId,
      ticket_type_name: ticketTypeName,
      seat_id: resolvedSeatId || undefined,
      seat_number: seatNumber || undefined,
      seat_zone: seatZone || undefined,
      ticket_price: ticketPrice,
      quantity,
      total_amount: totalAmount,
      payment_status: 'pending_payment',
      ticket_status: 'not_generated',
      checkin_status: 'pending',
    })

    // If seat_map mode, reserve the seat
    if (event.ticket_mode === 'seat_map' && resolvedSeatId) {
      await updateSeatStatus(resolvedSeatId, {
        status: 'reserved',
        reserved_by: line_user_id,
        reserved_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        reg_id,
      })
    }

    // Create payment record
    await createPayment({
      payment_id: uuidv4(),
      reg_id,
      event_id,
      amount_due: totalAmount,
      ocr_status: 'not_processed',
      payment_status: 'pending',
      rejection_count: 0,
      created_at: now.toISOString(),
    })

    // Audit log
    await createAuditLog({
      action: 'REGISTRATION_CREATED',
      actor_id: line_user_id,
      actor_name: customer_name,
      target_type: 'registration',
      target_id: reg_id,
      details: `Event: ${event_id}, Amount: ${totalAmount}`,
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        reg_id,
        total_amount: totalAmount,
        expires_at: expiresAt.toISOString(),
      },
      message: 'ลงทะเบียนสำเร็จ',
    })
  } catch (err) {
    console.error('POST /api/register error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
