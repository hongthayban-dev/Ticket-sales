import nodemailer from 'nodemailer'
import { Registration, Event } from '@/types'

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: (process.env.EMAIL_USER || '').replace(/^﻿/, ''),
      pass: (process.env.EMAIL_PASS || '').replace(/^﻿/, ''),
    },
  })
}

export async function sendTicketEmail(
  registration: Registration,
  event: Event,
  pngBuffer: Buffer
): Promise<void> {
  const transporter = createTransporter()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Ticket sales'

  const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ยืนยันการลงทะเบียน</title>
  <style>
    body { font-family: 'Sarabun', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 30px; }
    .greeting { font-size: 18px; color: #111827; margin-bottom: 16px; }
    .info-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dbeafe; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; font-size: 13px; }
    .info-value { color: #1e40af; font-weight: 600; font-size: 13px; }
    .badge { display: inline-block; background: #2563eb; color: white; border-radius: 20px; padding: 4px 16px; font-size: 13px; font-weight: 600; }
    .note { background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #713f12; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .reg-id { font-family: monospace; background: #1e3a8a; color: white; padding: 6px 16px; border-radius: 6px; font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎫 ${appName}</h1>
      <p>ยืนยันการลงทะเบียนสำเร็จ</p>
    </div>
    <div class="body">
      <p class="greeting">สวัสดีคุณ <strong>${registration.customer_name}</strong>,</p>
      <p style="color: #374151; font-size: 14px;">การลงทะเบียนของคุณได้รับการยืนยันเรียบร้อยแล้ว บัตรเข้างานของคุณแนบมาในอีเมลนี้</p>

      <div class="info-card">
        <div style="margin-bottom: 12px;">
          <span style="font-size: 11px; color: #6b7280;">รหัสลงทะเบียน</span><br>
          <span class="reg-id">${registration.reg_id}</span>
        </div>

        <div class="info-row">
          <span class="info-label">งาน</span>
          <span class="info-value">${event.event_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">วันที่</span>
          <span class="info-value">${new Date(event.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
        <div class="info-row">
          <span class="info-label">สถานที่</span>
          <span class="info-value">${event.event_venue}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ประเภทบัตร</span>
          <span class="info-value"><span class="badge">${registration.ticket_type_name}</span></span>
        </div>
        ${registration.seat_number ? `
        <div class="info-row">
          <span class="info-label">เลขที่นั่ง</span>
          <span class="info-value" style="font-size: 18px; font-weight: bold;">${registration.seat_number}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">ชื่อเล่น</span>
          <span class="info-value">${registration.customer_nickname || '-'}</span>
        </div>
      </div>

      <div class="note">
        <strong>📌 หมายเหตุ:</strong> กรุณาแสดงบัตรนี้ที่หน้างานเพื่อเข้าร่วมงาน บัตรนี้ใช้ได้เพียงครั้งเดียวเท่านั้น
        บัตรในรูปแบบรูปภาพได้แนบมาในอีเมลนี้ กรุณาบันทึกและเก็บไว้
      </div>

      <p style="color: #374151; font-size: 14px;">หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อเจ้าหน้าที่</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName} | อีเมลนี้ถูกส่งอัตโนมัติจากระบบ</p>
      <p>กรุณาอย่าตอบกลับอีเมลนี้</p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `"${appName}" <${process.env.EMAIL_FROM}>`,
    to: registration.customer_email,
    subject: `ยืนยันการลงทะเบียน ${appName} - ${event.event_name}`,
    html: htmlContent,
    attachments: [
      {
        filename: `ticket-${registration.reg_id}.png`,
        content: pngBuffer,
        contentType: 'image/png',
      },
    ],
  })
}

export async function sendRejectionEmail(
  customerEmail: string,
  customerName: string,
  eventName: string,
  reason: string,
  regId: string
): Promise<void> {
  const transporter = createTransporter()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Ticket sales'

  await transporter.sendMail({
    from: `"${appName}" <${process.env.EMAIL_FROM}>`,
    to: customerEmail,
    subject: `แจ้งผลการตรวจสอบการชำระเงิน - ${appName}`,
    html: `
<p>เรียนคุณ ${customerName},</p>
<p>ระบบไม่สามารถยืนยันการชำระเงินของคุณสำหรับรหัส <strong>${regId}</strong> (${eventName}) ได้</p>
<p><strong>เหตุผล:</strong> ${reason}</p>
<p>กรุณาอัปโหลดสลิปการโอนเงินใหม่อีกครั้งผ่านลิงก์ที่คุณได้รับ หรือติดต่อเจ้าหน้าที่</p>
<p>ขอบคุณค่ะ/ครับ<br>${appName}</p>
    `,
  })
}
