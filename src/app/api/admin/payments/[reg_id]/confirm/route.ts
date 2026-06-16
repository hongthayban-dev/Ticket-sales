import { NextResponse } from 'next/server'
import {
  getRegistrationById, getEventById, getTicketTypeById,
  updateRegistration, updatePayment, updateSeatStatus,
  incrementTicketSold, getPaymentByRegId, createAuditLog,
} from '@/lib/sheets'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { generateTicketPNG, generateTicketPDF } from '@/lib/ticket'
import { sendTicketToUser } from '@/lib/line'
import { sendTicketEmail } from '@/lib/email'
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
    const reg_id = params.reg_id
    const registration = await getRegistrationById(reg_id)
    if (!registration) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบการลงทะเบียน' }, { status: 404 })
    }

    if (registration.payment_status === 'paid') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ยืนยันแล้ว' }, { status: 400 })
    }

    const event = await getEventById(registration.event_id)
    if (!event) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบงาน' }, { status: 404 })
    }

    const ticketType = registration.ticket_type_id
      ? (await getTicketTypeById(registration.ticket_type_id)) ?? undefined
      : undefined

    // Generate ticket files
    const [pngBuffer, pdfBuffer] = await Promise.all([
      generateTicketPNG(registration, event, ticketType),
      generateTicketPDF(registration, event, ticketType),
    ])

    // Upload to Cloudinary
    const [pngUpload, pdfUpload] = await Promise.all([
      uploadToCloudinary(pngBuffer, `ticket_${reg_id}.png`, 'ticket-sales/tickets', 'image'),
      uploadToCloudinary(pdfBuffer, `ticket_${reg_id}.pdf`, 'ticket-sales/tickets', 'raw'),
    ])

    // Update registration
    await updateRegistration(reg_id, {
      payment_status: 'paid',
      ticket_status: 'sent',
      ticket_png_url: pngUpload.webViewLink,
      ticket_pdf_url: pdfUpload.webViewLink,
    })

    // Update payment
    const payment = await getPaymentByRegId(reg_id)
    if (payment) {
      await updatePayment(payment.payment_id, {
        payment_status: 'verified',
        confirmed_by: payload.staff_name,
        confirmed_at: new Date().toISOString(),
      })
    }

    // Update seat to paid (seat_map mode)
    if (registration.seat_id) {
      await updateSeatStatus(registration.seat_id, { status: 'paid' })
    }

    // Increment ticket_sold (ticket_type mode)
    if (event.ticket_mode === 'ticket_type' && registration.ticket_type_id) {
      try {
        await incrementTicketSold(registration.ticket_type_id, registration.quantity)
      } catch { /* ignore */ }
    }

    // Send ticket via LINE
    try {
      await sendTicketToUser(
        registration.line_user_id,
        registration.customer_name,
        event.event_name,
        reg_id,
        pngUpload.webViewLink,
        pngUpload.webViewLink
      )
    } catch (lineErr) {
      console.warn('LINE send failed:', lineErr)
    }

    // Send email
    if (registration.customer_email) {
      try {
        await sendTicketEmail(registration, event, pngBuffer)
      } catch (emailErr) {
        console.warn('Email send failed:', emailErr)
      }
    }

    // Audit log
    await createAuditLog({
      action: 'PAYMENT_CONFIRMED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'registration',
      target_id: reg_id,
      details: `Amount: ${registration.total_amount}`,
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ticket_png_url: pngUpload.webViewLink,
        ticket_pdf_url: pdfUpload.webViewLink,
      },
      message: 'ยืนยันการชำระเงินและส่งบัตรสำเร็จ',
    })
  } catch (err) {
    console.error('POST /api/admin/payments/[reg_id]/confirm error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
