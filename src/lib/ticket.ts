import { Registration, Event, TicketType } from '@/types'
import QRCode from 'qrcode'
import { readFileSync } from 'fs'
import path from 'path'

// ---- Font cache ----
type FontEntry = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }
let _fonts: FontEntry[] | null = null

function getKanitFonts(): FontEntry[] {
  if (_fonts) return _fonts
  const dir = path.join(process.cwd(), 'public', 'fonts')
  _fonts = [
    { name: 'Kanit', data: readFileSync(path.join(dir, 'Kanit-Regular.ttf')), weight: 400, style: 'normal' },
    { name: 'Kanit', data: readFileSync(path.join(dir, 'Kanit-Bold.ttf')),    weight: 700, style: 'normal' },
  ]
  return _fonts
}

// ---- QR helpers ----
export function generateCheckInQRData(regId: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ticket-sales.vercel.app').replace(/^﻿/, '')
  return `${appUrl}/checkin?reg_id=${regId}`
}

export async function generateQRCodeBase64(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  })
}

// ---- Utilities ----
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function formatThaiDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    })
  } catch {
    return dateStr
  }
}

// ---- Satori element builder ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SEl = { type: string; props: Record<string, any> }

function d(style: Record<string, unknown>, children?: SEl | SEl[] | string): SEl {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } }
}
function t(style: Record<string, unknown>, text: string): SEl {
  return { type: 'span', props: { style: { fontFamily: 'Kanit', ...style }, children: text } }
}

// ---- Main ticket PNG generator ----
export async function generateTicketPNG(
  registration: Registration,
  event: Event,
  ticketType?: TicketType
): Promise<Buffer> {
  const satori  = (await import('satori')).default
  const sharp   = (await import('sharp')).default

  const color      = ticketType?.ticket_color || '#2563eb'
  const lightBg    = hexToRgba(color, 0.08)
  const eventDate  = formatThaiDate(event.event_date)
  const qrBase64   = await generateQRCodeBase64(generateCheckInQRData(registration.reg_id))
  const fonts      = getKanitFonts()

  const ticket: SEl = d(
    {
      width: 800, height: 420, fontFamily: 'Kanit',
      backgroundColor: 'white', borderRadius: 20, overflow: 'hidden',
    },
    [
      // ── Left section ─────────────────────────────────────────
      d({ flexDirection: 'column', width: 520, height: 420, borderRight: `2px solid ${color}` }, [
        // Blue gradient header
        d({
          flexDirection: 'column',
          width: 520, height: 120,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          padding: '18px 30px 12px 30px',
          justifyContent: 'space-between',
        }, [
          t({ color: 'rgba(255,255,255,0.8)', fontSize: 13 }, 'Ticket sales'),
          t({ color: 'white', fontSize: 20, fontWeight: 700, flexShrink: 1 }, event.event_name),
          d({ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 10px', alignSelf: 'flex-start' },
            t({ color: 'white', fontSize: 12, fontWeight: 600 }, registration.ticket_type_name || 'ทั่วไป')
          ),
        ]),

        // White content
        d({ flexDirection: 'column', flex: 1, padding: '16px 30px', gap: 0 }, [
          t({ color: '#9ca3af', fontSize: 10, marginBottom: 2 }, 'ชื่อ-นามสกุล'),
          t({ color: '#111827', fontSize: 18, fontWeight: 700 }, registration.customer_name),
          ...(registration.customer_nickname
            ? [t({ color: '#6b7280', fontSize: 12, marginTop: 2 }, `ชื่อเล่น: ${registration.customer_nickname}`)]
            : []
          ),

          // Reg ID + Seat row
          d({ gap: 30, marginTop: 10 }, [
            d({ flexDirection: 'column', gap: 2 }, [
              t({ color: '#9ca3af', fontSize: 10 }, 'รหัสลงทะเบียน'),
              t({ color: '#1e40af', fontSize: 13, fontWeight: 700 }, registration.reg_id),
            ]),
            ...(registration.seat_number
              ? [d({ flexDirection: 'column', gap: 2 }, [
                  t({ color: '#9ca3af', fontSize: 10 }, 'เลขที่นั่ง'),
                  t({ color, fontSize: 20, fontWeight: 700 }, registration.seat_number),
                ])]
              : []
            ),
          ]),

          // Date + Venue row
          d({ gap: 30, marginTop: 10 }, [
            d({ flexDirection: 'column', gap: 2 }, [
              t({ color: '#9ca3af', fontSize: 10 }, 'วันที่จัดงาน'),
              t({ color: '#374151', fontSize: 11, fontWeight: 600 }, eventDate),
            ]),
            d({ flexDirection: 'column', gap: 2 }, [
              t({ color: '#9ca3af', fontSize: 10 }, 'สถานที่'),
              t({ color: '#374151', fontSize: 11, fontWeight: 600 }, event.event_venue || '-'),
            ]),
          ]),
        ]),

        // Footer bar
        d({
          width: 520, backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb', padding: '8px 30px',
          flexDirection: 'column', gap: 2,
        }, [
          t({ color: '#9ca3af', fontSize: 10 }, 'ใช้แสดงหน้างานเพื่อเข้างาน | บัตรนี้ใช้ได้ครั้งเดียวเท่านั้น'),
          t({ color: '#d1d5db', fontSize: 9 }, `Ticket sales • ${registration.reg_id}`),
        ]),
      ]),

      // ── Right section (QR) ───────────────────────────────────
      d({
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: 1, backgroundColor: lightBg, gap: 8,
      }, [
        // QR Code
        d({
          padding: 8, backgroundColor: 'white',
          borderRadius: 12, border: `3px solid ${color}`,
        }, {
          type: 'img',
          props: { src: qrBase64, width: 162, height: 162, style: {} },
        }),

        t({ color, fontSize: 11, fontWeight: 600 }, 'สแกนเพื่อ Check-in'),
        t({ color: '#9ca3af', fontSize: 10 }, 'Scan for Check-in'),

        // Reg badge
        d({ backgroundColor: hexToRgba(color, 0.12), borderRadius: 8, padding: '3px 10px' },
          t({ color, fontSize: 10, fontWeight: 700 }, registration.reg_id)
        ),
      ]),
    ]
  )

  const svg = await satori(ticket as Parameters<typeof satori>[0], {
    width: 800, height: 420, fonts,
  })

  return sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer()
}

// ---- Backward-compat alias ----
export async function generateTicketSVG(
  registration: Registration, event: Event, ticketType?: TicketType
): Promise<string> {
  const pngBuffer = await generateTicketPNG(registration, event, ticketType)
  return `data:image/png;base64,${pngBuffer.toString('base64')}`
}

// ---- PDF wraps PNG ----
export async function generateTicketPDF(
  registration: Registration, event: Event, ticketType?: TicketType
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default
  const pngBuffer = await generateTicketPNG(registration, event, ticketType)
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [800, 420], margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.image(pngBuffer, 0, 0, { width: 800, height: 420 })
    doc.end()
  })
}
