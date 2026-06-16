import { NextResponse } from 'next/server'
import { getRegistrationById, getEventById, getTicketTypeById, updateRegistration } from '@/lib/sheets'
import { sendTicketEmail } from '@/lib/email'
import { generateTicketPNG, generateTicketPDF } from '@/lib/ticket'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function POST(
  _request: Request,
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
    if (registration.payment_status !== 'paid') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ยังไม่ได้ยืนยันการชำระเงิน' }, { status: 400 })
    }
    if (!registration.customer_email) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่มีอีเมลผู้ลงทะเบียน' }, { status: 400 })
    }
    const event = await getEventById(registration.event_id)
    if (!event) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบงาน' }, { status: 404 })
    }

    const ticketType = registration.ticket_type_id
      ? (await getTicketTypeById(registration.ticket_type_id)) ?? undefined
      : undefined

    // Regenerate ticket files with current font/design
    const [pngBuffer, pdfBuffer] = await Promise.all([
      generateTicketPNG(registration, event, ticketType),
      generateTicketPDF(registration, event, ticketType),
    ])

    // Upload new versions to Cloudinary
    const [pngUpload, pdfUpload] = await Promise.all([
      uploadToCloudinary(pngBuffer, `ticket_${reg_id}.png`, 'ticket-sales/tickets', 'image'),
      uploadToCloudinary(pdfBuffer, `ticket_${reg_id}.pdf`, 'ticket-sales/tickets', 'raw'),
    ])

    await updateRegistration(reg_id, {
      ticket_png_url: pngUpload.webViewLink,
      ticket_pdf_url: pdfUpload.webViewLink,
    })

    await sendTicketEmail(registration, event, pngBuffer)

    return NextResponse.json<ApiResponse>({ success: true, message: 'ส่งอีเมลสำเร็จ' })
  } catch (err) {
    console.error('POST resend email error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
