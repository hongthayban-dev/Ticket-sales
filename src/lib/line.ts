const LINE_API_BASE = 'https://api.line.me/v2/bot'

async function linePost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${LINE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LINE API error: ${res.status} ${err}`)
  }
  return res.json()
}

export async function pushMessage(userId: string, messages: object[]): Promise<void> {
  await linePost('/message/push', {
    to: userId,
    messages,
  })
}

export async function sendTextMessage(userId: string, text: string): Promise<void> {
  await pushMessage(userId, [{ type: 'text', text }])
}

export async function sendImageMessage(userId: string, originalUrl: string, previewUrl: string): Promise<void> {
  await pushMessage(userId, [{
    type: 'image',
    originalContentUrl: originalUrl,
    previewImageUrl: previewUrl,
  }])
}

export async function sendFlexMessage(userId: string, altText: string, contents: object): Promise<void> {
  await pushMessage(userId, [{
    type: 'flex',
    altText,
    contents,
  }])
}

export async function notifyAdminNewPayment(
  adminLineUserId: string,
  regId: string,
  customerName: string,
  amount: number,
  eventName: string,
  adminUrl: string
): Promise<void> {
  await sendFlexMessage(adminLineUserId, `มีการชำระเงินใหม่รอตรวจสอบ - ${customerName}`, {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🎫 Ticket sales', weight: 'bold', color: '#ffffff', size: 'sm' },
        { type: 'text', text: 'มีการชำระเงินใหม่', weight: 'bold', color: '#ffffff', size: 'lg' },
      ],
      backgroundColor: '#1e40af',
      paddingAll: '15px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: eventName, weight: 'bold', size: 'md', color: '#1e40af' },
        { type: 'separator', margin: 'md' },
        {
          type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm',
          contents: [
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: 'ลูกค้า', size: 'sm', color: '#666666', flex: 2 },
              { type: 'text', text: customerName, size: 'sm', weight: 'bold', flex: 3, wrap: true },
            ]},
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: 'รหัส', size: 'sm', color: '#666666', flex: 2 },
              { type: 'text', text: regId, size: 'sm', weight: 'bold', flex: 3 },
            ]},
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: 'ยอดเงิน', size: 'sm', color: '#666666', flex: 2 },
              { type: 'text', text: `฿${amount.toLocaleString()}`, size: 'sm', weight: 'bold', color: '#059669', flex: 3 },
            ]},
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [{
        type: 'button',
        style: 'primary',
        color: '#2563eb',
        action: { type: 'uri', label: 'ตรวจสอบสลิป', uri: adminUrl },
      }],
    },
  })
}

export async function sendTicketToUser(
  userId: string,
  customerName: string,
  eventName: string,
  regId: string,
  ticketPngUrl: string,
  ticketPreviewUrl: string
): Promise<void> {
  await pushMessage(userId, [
    {
      type: 'text',
      text: `🎉 ยืนยันการลงทะเบียนสำเร็จ!\n\nสวัสดีคุณ ${customerName}\nบัตรเข้างาน "${eventName}" ของคุณพร้อมแล้ว\nรหัส: ${regId}\n\nกรุณาเก็บบัตรนี้ไว้แสดงหน้างาน`,
    },
    {
      type: 'image',
      originalContentUrl: ticketPngUrl,
      previewImageUrl: ticketPreviewUrl,
    },
  ])
}

export async function sendRejectionNotice(
  userId: string,
  customerName: string,
  reason: string
): Promise<void> {
  await sendTextMessage(
    userId,
    `⚠️ แจ้งผลการชำระเงิน\n\nเรียนคุณ ${customerName}\n\nระบบไม่สามารถยืนยันการชำระเงินของคุณได้\nเหตุผล: ${reason}\n\nกรุณาอัปโหลดสลิปใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่`
  )
}
