import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  getRegistrationById, updateRegistration,
  updateSeatStatus, createCheckIn, createAuditLog,
  getRegistrationsByPhone, getRegistrationsByName,
} from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function POST(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('staff')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reg_id, method = 'qr_scan', device_info } = await request.json()

    if (!reg_id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'reg_id required' }, { status: 400 })
    }

    const registration = await getRegistrationById(reg_id)
    if (!registration) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'ไม่พบบัตรนี้ในระบบ',
        data: { status: 'NOT_FOUND' },
      }, { status: 404 })
    }

    if (registration.payment_status !== 'paid') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'บัตรนี้ยังไม่ได้รับการยืนยันการชำระเงิน',
        data: { status: 'NOT_PAID', payment_status: registration.payment_status },
      }, { status: 400 })
    }

    if (registration.checkin_status === 'checked_in') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'บัตรนี้ถูกใช้เข้างานแล้ว',
        data: {
          status: 'ALREADY_CHECKED_IN',
          checkin_at: registration.checkin_at,
          checkin_by: registration.checkin_by,
        },
      }, { status: 409 })
    }

    const now = new Date().toISOString()

    // Update registration
    await updateRegistration(reg_id, {
      checkin_status: 'checked_in',
      checkin_at: now,
      checkin_by: payload.staff_name,
    })

    // Update seat status
    if (registration.seat_id) {
      await updateSeatStatus(registration.seat_id, { status: 'checked_in' })
    }

    // Create check-in record
    await createCheckIn({
      checkin_id: uuidv4(),
      reg_id,
      event_id: registration.event_id,
      line_user_id: registration.line_user_id,
      customer_name: registration.customer_name,
      seat_number: registration.seat_number,
      ticket_type: registration.ticket_type_name,
      checkin_at: now,
      checkin_by: payload.staff_name,
      checkin_method: method,
      device_info,
    })

    // Audit log
    await createAuditLog({
      action: 'CHECKIN',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'registration',
      target_id: reg_id,
      details: `Method: ${method}`,
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        status: 'OK',
        customer_name: registration.customer_name,
        customer_nickname: registration.customer_nickname,
        ticket_type: registration.ticket_type_name,
        seat_number: registration.seat_number,
        checkin_at: now,
      },
      message: 'เช็คอินสำเร็จ',
    })
  } catch (err) {
    console.error('POST /api/checkin error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// Verify ticket without checking in (supports ?reg_id=, ?phone=, ?name=)
export async function GET(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('staff')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const reg_id = searchParams.get('reg_id')
  const phone  = searchParams.get('phone')
  const name   = searchParams.get('name')

  try {
    // Phone / name search — returns list
    if (phone || name) {
      const regs = phone
        ? await getRegistrationsByPhone(phone)
        : await getRegistrationsByName(name!)

      const list = regs.map(r => ({
        reg_id:            r.reg_id,
        customer_name:     r.customer_name,
        customer_nickname: r.customer_nickname,
        customer_phone:    r.customer_phone,
        ticket_type:       r.ticket_type_name,
        seat_number:       r.seat_number,
        payment_status:    r.payment_status,
        checkin_status:    r.checkin_status,
        checkin_at:        r.checkin_at,
      }))
      return NextResponse.json<ApiResponse>({ success: true, data: { type: 'list', results: list } })
    }

    // Single reg_id lookup
    if (!reg_id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'reg_id, phone or name required' }, { status: 400 })
    }

    const registration = await getRegistrationById(reg_id)
    if (!registration) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'ไม่พบบัตรนี้ในระบบ',
        data: { status: 'NOT_FOUND' },
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        type: 'single',
        reg_id: registration.reg_id,
        customer_name: registration.customer_name,
        customer_nickname: registration.customer_nickname,
        ticket_type: registration.ticket_type_name,
        seat_number: registration.seat_number,
        payment_status: registration.payment_status,
        checkin_status: registration.checkin_status,
        checkin_at: registration.checkin_at,
      },
    })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to verify' }, { status: 500 })
  }
}
