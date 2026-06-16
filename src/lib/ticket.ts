import { Registration, Event, TicketType } from '@/types'
import QRCode from 'qrcode'
import path from 'path'

function getFontUris(): { regular: string; bold: string } {
  const dir = path.join(process.cwd(), 'public', 'fonts')
  const toUri = (p: string) => {
    const fwd = p.replace(/\\/g, '/')
    return fwd.startsWith('/') ? `file://${fwd}` : `file:///${fwd}`
  }
  return {
    regular: toUri(path.join(dir, 'Kanit-Regular.ttf')),
    bold:    toUri(path.join(dir, 'Kanit-Bold.ttf')),
  }
}

// ============================================================
// Generate QR Code data for check-in
// ============================================================
export function generateCheckInQRData(regId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticket-sales.vercel.app'
  return `${appUrl}/checkin?reg_id=${regId}`
}

// ============================================================
// Generate QR Code as base64 PNG
// ============================================================
export async function generateQRCodeBase64(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
    color: {
      dark: '#1e3a8a',
      light: '#ffffff',
    },
  })
}

// ============================================================
// Generate Ticket as SVG (for PNG export via sharp)
// ============================================================
export async function generateTicketSVG(
  registration: Registration,
  event: Event,
  ticketType?: TicketType
): Promise<string> {
  const qrData = generateCheckInQRData(registration.reg_id)
  const qrBase64 = await generateQRCodeBase64(qrData)

  const ticketColor = ticketType?.ticket_color || '#2563eb'
  const lightColor = hexToRgba(ticketColor, 0.1)

  const eventDate = formatThaiDate(event.event_date)

  const fonts = getFontUris()

  const svg = `
<svg width="800" height="420" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      @font-face {
        font-family: 'Kanit';
        font-weight: 400;
        src: url('${fonts.regular}') format('truetype');
      }
      @font-face {
        font-family: 'Kanit';
        font-weight: 700;
        src: url('${fonts.bold}') format('truetype');
      }
    </style>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-opacity="0.15"/>
    </filter>
    <clipPath id="cardClip">
      <rect width="800" height="420" rx="20" ry="20"/>
    </clipPath>
  </defs>

  <!-- Card background -->
  <rect width="800" height="420" rx="20" ry="20" fill="white" filter="url(#shadow)"/>

  <!-- Left header (gradient) -->
  <rect x="0" y="0" width="520" height="120" fill="url(#headerGrad)" clip-path="url(#cardClip)"/>

  <!-- System name -->
  <text x="30" y="45" font-family="Kanit, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" font-weight="500">🎫 Ticket sales</text>

  <!-- Event name -->
  <text x="30" y="80" font-family="Kanit, sans-serif" font-size="22" fill="white" font-weight="bold">${escapeXml(event.event_name)}</text>

  <!-- Ticket type badge -->
  <rect x="30" y="95" width="${getTextWidth(registration.ticket_type_name) + 20}" height="24" rx="12" fill="rgba(255,255,255,0.2)"/>
  <text x="40" y="111" font-family="Kanit, sans-serif" font-size="13" fill="white" font-weight="600">${escapeXml(registration.ticket_type_name)}</text>

  <!-- Right header (ticket color accent) -->
  <rect x="520" y="0" width="280" height="420" fill="${lightColor}" clip-path="url(#cardClip)"/>
  <rect x="520" y="0" width="4" height="420" fill="${ticketColor}"/>

  <!-- Divider line with circles (ticket tear effect) -->
  <line x1="520" y1="0" x2="520" y2="420" stroke="${ticketColor}" stroke-width="2" stroke-dasharray="8,6"/>
  <circle cx="520" cy="0" r="20" fill="white"/>
  <circle cx="520" cy="420" r="20" fill="white"/>

  <!-- QR Code area -->
  <rect x="552" y="50" width="200" height="200" rx="10" fill="white"/>
  <image x="561" y="59" width="182" height="182" href="${qrBase64}"/>

  <text x="652" y="270" font-family="Kanit, sans-serif" font-size="11" fill="${ticketColor}" text-anchor="middle" font-weight="600">สแกนเพื่อ Check-in</text>
  <text x="652" y="286" font-family="Kanit, sans-serif" font-size="10" fill="#666666" text-anchor="middle">Scan for Check-in</text>

  <!-- Main content area -->
  <!-- Customer info -->
  <text x="30" y="155" font-family="Kanit, sans-serif" font-size="11" fill="#6b7280" font-weight="500">ชื่อ-นามสกุล</text>
  <text x="30" y="175" font-family="Kanit, sans-serif" font-size="20" fill="#111827" font-weight="bold">${escapeXml(registration.customer_name)}</text>

  ${registration.customer_nickname ? `
  <text x="30" y="198" font-family="Kanit, sans-serif" font-size="13" fill="#6b7280">ชื่อเล่น: ${escapeXml(registration.customer_nickname)}</text>
  ` : ''}

  <!-- Info grid -->
  <text x="30" y="235" font-family="Kanit, sans-serif" font-size="11" fill="#6b7280">รหัสลงทะเบียน</text>
  <text x="30" y="252" font-family="Kanit, sans-serif" font-size="14" fill="#1e40af" font-weight="bold">${escapeXml(registration.reg_id)}</text>

  ${registration.seat_number ? `
  <text x="200" y="235" font-family="Kanit, sans-serif" font-size="11" fill="#6b7280">เลขที่นั่ง</text>
  <text x="200" y="252" font-family="Kanit, sans-serif" font-size="22" fill="${ticketColor}" font-weight="bold">${escapeXml(registration.seat_number)}</text>
  ` : ''}

  <!-- Separator -->
  <line x1="30" y1="265" x2="490" y2="265" stroke="#e5e7eb" stroke-width="1"/>

  <!-- Event details -->
  <text x="30" y="285" font-family="Kanit, sans-serif" font-size="11" fill="#6b7280">📅 วันที่</text>
  <text x="30" y="302" font-family="Kanit, sans-serif" font-size="13" fill="#374151" font-weight="600">${escapeXml(eventDate)}</text>

  <text x="200" y="285" font-family="Kanit, sans-serif" font-size="11" fill="#6b7280">📍 สถานที่</text>
  <text x="200" y="302" font-family="Kanit, sans-serif" font-size="13" fill="#374151" font-weight="600">${escapeXml(event.event_venue)}</text>

  <!-- Footer -->
  <rect x="0" y="360" width="800" height="60" fill="#f9fafb" clip-path="url(#cardClip)"/>
  <line x1="0" y1="360" x2="800" y2="360" stroke="#e5e7eb" stroke-width="1"/>

  <text x="30" y="385" font-family="Kanit, sans-serif" font-size="11" fill="#9ca3af">ใช้แสดงหน้างานเพื่อเข้างาน | บัตรนี้ใช้ได้ครั้งเดียวเท่านั้น</text>
  <text x="30" y="403" font-family="Kanit, sans-serif" font-size="10" fill="#d1d5db">Ticket sales • ${escapeXml(registration.reg_id)}</text>

  <text x="770" y="395" font-family="Kanit, sans-serif" font-size="10" fill="${ticketColor}" font-weight="bold" text-anchor="end">VALID TICKET</text>
</svg>`

  return svg
}

// ============================================================
// Generate PDF ticket — wraps PNG image to avoid Thai font issues
// ============================================================
export async function generateTicketPDF(
  registration: Registration,
  event: Event,
  ticketType?: TicketType
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

  // Generate PNG first (SVG renderer handles Thai correctly via system fonts)
  const pngBuffer = await generateTicketPNG(registration, event, ticketType)

  return new Promise((resolve, reject) => {
    // A4 landscape-ish: match ticket aspect ratio 800×420
    const doc = new PDFDocument({ size: [800, 420], margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.image(pngBuffer, 0, 0, { width: 800, height: 420 })
    doc.end()
  })
}

// ============================================================
// Generate PNG via SVG → Sharp
// ============================================================
export async function generateTicketPNG(
  registration: Registration,
  event: Event,
  ticketType?: TicketType
): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const svg = await generateTicketSVG(registration, event, ticketType)
  return sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer()
}

// ============================================================
// Helper functions
// ============================================================
function escapeXml(str: string | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r},${g},${b})`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getTextWidth(text: string): number {
  return text.length * 8
}

function formatThaiDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  } catch {
    return dateStr
  }
}
