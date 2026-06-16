import { NextRequest, NextResponse } from 'next/server'
import {
  getRegistrationById, getPaymentByRegId,
  updatePayment, updateRegistration, createAuditLog,
} from '@/lib/sheets'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { performOcr } from '@/lib/ocr'
import { notifyAdminNewPayment } from '@/lib/line'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const reg_id = formData.get('reg_id') as string
    const slipFile = formData.get('slip') as File

    if (!reg_id || !slipFile) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาระบุ reg_id และสลิป' }, { status: 400 })
    }

    const registration = await getRegistrationById(reg_id)
    if (!registration) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบการลงทะเบียน' }, { status: 404 })
    }

    if (registration.payment_status === 'paid') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ชำระเงินแล้ว' }, { status: 400 })
    }

    // Read file buffer
    const arrayBuffer = await slipFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = slipFile.type || 'image/jpeg'
    const filename = `slip_${reg_id}_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`

    // Upload to Cloudinary
    const { id: driveId, webViewLink } = await uploadToCloudinary(buffer, filename, 'slipimage')

    // OCR
    const ocrResult = await performOcr(buffer)

    // Update payment record
    const payment = await getPaymentByRegId(reg_id)
    if (payment) {
      await updatePayment(payment.payment_id, {
        slip_url: webViewLink,
        slip_drive_id: driveId,
        slip_filename: filename,
        ocr_amount: ocrResult.ocr_amount,
        ocr_transfer_date: ocrResult.ocr_transfer_date,
        ocr_transfer_time: ocrResult.ocr_transfer_time,
        ocr_sender_name: ocrResult.ocr_sender_name,
        ocr_receiver_name: ocrResult.ocr_receiver_name,
        ocr_bank: ocrResult.ocr_bank,
        ocr_confidence: ocrResult.ocr_confidence,
        ocr_raw_text: ocrResult.ocr_raw_text,
        ocr_status: ocrResult.ocr_status,
        payment_status: 'pending',
      })
    }

    // Update registration status
    await updateRegistration(reg_id, { payment_status: 'verifying' })

    // Notify admin
    const adminUserId = process.env.ADMIN_LINE_USER_ID
    if (adminUserId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      try {
        await notifyAdminNewPayment(
          adminUserId,
          reg_id,
          registration.customer_name,
          registration.total_amount,
          registration.event_id,
          `${appUrl}/admin/payments/${reg_id}`
        )
      } catch (lineErr) {
        console.warn('LINE notify failed:', lineErr)
      }
    }

    // Audit log
    await createAuditLog({
      action: 'SLIP_UPLOADED',
      actor_id: registration.line_user_id,
      actor_name: registration.customer_name,
      target_type: 'payment',
      target_id: reg_id,
      details: `OCR status: ${ocrResult.ocr_status}, confidence: ${ocrResult.ocr_confidence}%`,
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        drive_id: driveId,
        ocr_status: ocrResult.ocr_status,
        ocr_confidence: ocrResult.ocr_confidence,
      },
      message: 'อัปโหลดสลิปสำเร็จ รอการตรวจสอบจากเจ้าหน้าที่',
    })
  } catch (err) {
    console.error('POST /api/payment/upload-slip error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลด' }, { status: 500 })
  }
}
