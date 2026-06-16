import { NextResponse } from 'next/server'
import {
  getRegistrationById, updateRegistration,
  updatePayment, updateSeatStatus, getPaymentByRegId, createAuditLog,
} from '@/lib/sheets'
import { sendRejectionNotice } from '@/lib/line'
import { sendRejectionEmail } from '@/lib/email'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function POST(
  request: Request,
  { params }: { params: { reg_id: string } }
) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reason } = await request.json()
    const reg_id = params.reg_id

    if (!reason) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาระบุเหตุผล' }, { status: 400 })
    }

    const registration = await getRegistrationById(reg_id)
    if (!registration) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบการลงทะเบียน' }, { status: 404 })
    }

    // Update registration
    await updateRegistration(reg_id, { payment_status: 'rejected' })

    // Update payment
    const payment = await getPaymentByRegId(reg_id)
    if (payment) {
      await updatePayment(payment.payment_id, {
        payment_status: 'rejected',
        rejected_reason: reason,
        rejection_count: (payment.rejection_count || 0) + 1,
      })
    }

    // Release seat if reserved
    if (registration.seat_id) {
      await updateSeatStatus(registration.seat_id, {
        status: 'available',
        reserved_by: '',
        reserved_at: '',
        expires_at: '',
        reg_id: '',
      })
    }

    // Notify customer via LINE
    try {
      await sendRejectionNotice(registration.line_user_id, registration.customer_name, reason)
    } catch { /* ignore */ }

    // Notify via email
    if (registration.customer_email) {
      try {
        await sendRejectionEmail(
          registration.customer_email,
          registration.customer_name,
          registration.event_id,
          reason,
          reg_id
        )
      } catch { /* ignore */ }
    }

    // Audit log
    await createAuditLog({
      action: 'PAYMENT_REJECTED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'registration',
      target_id: reg_id,
      details: `Reason: ${reason}`,
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'ปฏิเสธการชำระเงินแล้ว' })
  } catch (err) {
    console.error('POST /api/admin/payments/[reg_id]/reject error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
