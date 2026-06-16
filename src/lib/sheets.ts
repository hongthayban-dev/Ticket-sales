import { google, sheets_v4 } from 'googleapis'
import {
  Event, TicketType, Seat, Registration, Payment,
  Staff, CheckIn, Setting, AuditLog,
} from '@/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64!
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  })
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

// ============================================================
// Generic helpers
// ============================================================
async function getRows(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  })
  return (res.data.values as string[][] | null) ?? []
}

async function appendRow(sheetName: string, values: (string | number | boolean | undefined | null)[]): Promise<void> {
  const sheets = await getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values.map(v => v ?? '')] },
  })
}

async function updateRow(sheetName: string, rowIndex: number, values: (string | number | boolean | undefined | null)[]): Promise<void> {
  const sheets = await getSheetsClient()
  const range = `${sheetName}!A${rowIndex + 1}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values.map(v => v ?? '')] },
  })
}

async function updateCell(sheetName: string, rowIndex: number, colLetter: string, value: string | number): Promise<void> {
  const sheets = await getSheetsClient()
  const range = `${sheetName}!${colLetter}${rowIndex + 1}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}

// ============================================================
// SHEET NAMES
// ============================================================
export const SHEETS = {
  EVENTS: 'events',
  TICKETS: 'tickets',
  SEATS: 'seats',
  REGISTRATIONS: 'registrations',
  PAYMENTS: 'payments',
  STAFFS: 'staffs',
  CHECKINS: 'checkins',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'audit_logs',
}

// ============================================================
// EVENTS
// ============================================================
function rowToEvent(row: string[]): Event {
  return {
    event_id:           row[0],
    event_name:         row[1],
    event_date:         row[2],
    event_end_date:     row[3],
    event_venue:        row[4],
    event_description:  row[5],
    event_image:        row[6],
    ticket_mode:        (row[7] as Event['ticket_mode']) || 'ticket_type',
    max_capacity:       Number(row[8]) || 0,
    status:             (row[9] as Event['status']) || 'draft',
    promptpay_number:   row[10],
    banner_url:         row[11],
    reservation_timeout: Number(row[12]) || 15,
    created_at:         row[13],
    updated_at:         row[14],
    promptpay_qr_url:   row[15],
  }
}

export async function getEvents(): Promise<Event[]> {
  const rows = await getRows(SHEETS.EVENTS)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0]).map(rowToEvent)
}

export async function getEventById(id: string): Promise<Event | null> {
  const events = await getEvents()
  return events.find(e => e.event_id === id) ?? null
}

export async function getActiveEvents(): Promise<Event[]> {
  const events = await getEvents()
  return events.filter(e => e.status === 'active')
}

export async function createEvent(event: Omit<Event, 'created_at' | 'updated_at'>): Promise<void> {
  await appendRow(SHEETS.EVENTS, [
    event.event_id, event.event_name, event.event_date, event.event_end_date ?? '',
    event.event_venue, event.event_description, event.event_image ?? '',
    event.ticket_mode, event.max_capacity, event.status, event.promptpay_number ?? '',
    event.banner_url ?? '', event.reservation_timeout,
    new Date().toISOString(), new Date().toISOString(),
    event.promptpay_qr_url ?? '',
  ])
}

export async function updateEvent(event_id: string, updates: Partial<Event>): Promise<void> {
  const rows = await getRows(SHEETS.EVENTS)
  const idx = rows.findIndex(r => r[0] === event_id)
  if (idx < 0) throw new Error('Event not found')
  const current = rowToEvent(rows[idx])
  const merged = { ...current, ...updates, updated_at: new Date().toISOString() }
  await updateRow(SHEETS.EVENTS, idx, [
    merged.event_id, merged.event_name, merged.event_date, merged.event_end_date ?? '',
    merged.event_venue, merged.event_description, merged.event_image ?? '',
    merged.ticket_mode, merged.max_capacity, merged.status, merged.promptpay_number ?? '',
    merged.banner_url ?? '', merged.reservation_timeout,
    merged.created_at, merged.updated_at,
    merged.promptpay_qr_url ?? '',
  ])
}

// ============================================================
// TICKET TYPES
// ============================================================
function rowToTicketType(row: string[]): TicketType {
  const quota = Number(row[5]) || 0
  const sold  = Number(row[6]) || 0
  return {
    ticket_id:          row[0],
    event_id:           row[1],
    ticket_type:        row[2],
    ticket_name:        row[3],
    ticket_price:       Number(row[4]) || 0,
    ticket_quota:       quota,
    ticket_sold:        sold,
    ticket_remaining:   Math.max(0, quota - sold),
    ticket_color:       row[7] || '#2563eb',
    ticket_description: row[8],
    status:             (row[9] as TicketType['status']) || 'active',
    sort_order:         Number(row[10]) || 0,
  }
}

export async function getTicketTypes(event_id: string): Promise<TicketType[]> {
  const rows = await getRows(SHEETS.TICKETS)
  if (rows.length <= 1) return []
  return rows.slice(1)
    .filter(r => r[0] && r[1] === event_id)
    .map(rowToTicketType)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function getTicketTypeById(ticket_id: string): Promise<TicketType | null> {
  const rows = await getRows(SHEETS.TICKETS)
  const row = rows.slice(1).find(r => r[0] === ticket_id)
  return row ? rowToTicketType(row) : null
}

export async function createTicketType(t: Omit<TicketType, 'ticket_remaining'>): Promise<void> {
  await appendRow(SHEETS.TICKETS, [
    t.ticket_id, t.event_id, t.ticket_type, t.ticket_name,
    t.ticket_price, t.ticket_quota, t.ticket_sold,
    t.ticket_color, t.ticket_description ?? '', t.status, t.sort_order,
  ])
}

export async function incrementTicketSold(ticket_id: string, qty = 1): Promise<void> {
  const rows = await getRows(SHEETS.TICKETS)
  const idx = rows.findIndex(r => r[0] === ticket_id)
  if (idx < 0) throw new Error('Ticket type not found')
  const sold = Number(rows[idx][5]) + qty
  await updateCell(SHEETS.TICKETS, idx, 'F', sold)
}

export async function updateTicketType(ticket_id: string, updates: Partial<TicketType>): Promise<void> {
  const rows = await getRows(SHEETS.TICKETS)
  const idx = rows.findIndex(r => r[0] === ticket_id)
  if (idx < 0) throw new Error('Ticket type not found')
  const current = rowToTicketType(rows[idx])
  const merged = { ...current, ...updates }
  await updateRow(SHEETS.TICKETS, idx, [
    merged.ticket_id, merged.event_id, merged.ticket_type, merged.ticket_name,
    merged.ticket_price, merged.ticket_quota, merged.ticket_sold,
    merged.ticket_color, merged.ticket_description ?? '', merged.status, merged.sort_order,
  ])
}

// ============================================================
// SEATS
// ============================================================
function rowToSeat(row: string[]): Seat {
  return {
    seat_id:      row[0],
    event_id:     row[1],
    seat_number:  row[2],
    seat_zone:    row[3],
    seat_row:     row[4],
    seat_col:     Number(row[5]) || 0,
    ticket_type_id: row[6],
    seat_type:    row[7],
    price:        Number(row[8]) || 0,
    status:       (row[9] as Seat['status']) || 'available',
    reserved_by:  row[10],
    reserved_at:  row[11],
    expires_at:   row[12],
    reg_id:       row[13],
    display_label: row[14] || row[2],
  }
}

export async function getSeats(event_id: string): Promise<Seat[]> {
  const rows = await getRows(SHEETS.SEATS)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0] && r[1] === event_id).map(rowToSeat)
}

export async function getSeatById(seat_id: string): Promise<Seat | null> {
  const rows = await getRows(SHEETS.SEATS)
  const row = rows.slice(1).find(r => r[0] === seat_id)
  return row ? rowToSeat(row) : null
}

export async function createSeat(seat: Seat): Promise<void> {
  await appendRow(SHEETS.SEATS, [
    seat.seat_id, seat.event_id, seat.seat_number, seat.seat_zone,
    seat.seat_row, seat.seat_col, seat.ticket_type_id, seat.seat_type,
    seat.price, seat.status, seat.reserved_by ?? '', seat.reserved_at ?? '',
    seat.expires_at ?? '', seat.reg_id ?? '', seat.display_label ?? seat.seat_number,
  ])
}

export async function updateSeatStatus(seat_id: string, updates: Partial<Seat>): Promise<void> {
  const rows = await getRows(SHEETS.SEATS)
  const idx = rows.findIndex(r => r[0] === seat_id)
  if (idx < 0) throw new Error('Seat not found')
  const current = rowToSeat(rows[idx])
  const merged = { ...current, ...updates }
  await updateRow(SHEETS.SEATS, idx, [
    merged.seat_id, merged.event_id, merged.seat_number, merged.seat_zone,
    merged.seat_row, merged.seat_col, merged.ticket_type_id, merged.seat_type,
    merged.price, merged.status, merged.reserved_by ?? '', merged.reserved_at ?? '',
    merged.expires_at ?? '', merged.reg_id ?? '', merged.display_label ?? merged.seat_number,
  ])
}

export async function releaseExpiredSeats(): Promise<void> {
  const rows = await getRows(SHEETS.SEATS)
  const now = new Date()
  for (let i = 1; i < rows.length; i++) {
    const seat = rowToSeat(rows[i])
    if (seat.status === 'reserved' && seat.expires_at) {
      const expires = new Date(seat.expires_at)
      if (now > expires) {
        await updateSeatStatus(seat.seat_id, {
          status: 'available', reserved_by: '', reserved_at: '', expires_at: '', reg_id: '',
        })
      }
    }
  }
}

// ============================================================
// REGISTRATIONS
// ============================================================
function rowToRegistration(row: string[]): Registration {
  return {
    reg_id:             row[0],
    event_id:           row[1],
    line_user_id:       row[2],
    line_display_name:  row[3],
    customer_name:      row[4],
    customer_nickname:  row[5],
    customer_phone:     row[6],
    customer_email:     row[7],
    ticket_type_id:     row[8],
    ticket_type_name:   row[9],
    seat_id:            row[10],
    seat_number:        row[11],
    seat_zone:          row[12],
    ticket_price:       Number(row[13]) || 0,
    quantity:           Number(row[14]) || 1,
    total_amount:       Number(row[15]) || 0,
    payment_status:     (row[16] as Registration['payment_status']) || 'pending',
    ticket_status:      (row[17] as Registration['ticket_status']) || 'not_generated',
    ticket_png_url:     row[18],
    ticket_pdf_url:     row[19],
    checkin_status:     (row[20] as Registration['checkin_status']) || 'pending',
    checkin_at:         row[21],
    checkin_by:         row[22],
    created_at:         row[23],
    updated_at:         row[24],
  }
}

export async function getRegistrations(event_id?: string): Promise<Registration[]> {
  const rows = await getRows(SHEETS.REGISTRATIONS)
  if (rows.length <= 1) return []
  let regs = rows.slice(1).filter(r => r[0]).map(rowToRegistration)
  if (event_id) regs = regs.filter(r => r.event_id === event_id)
  return regs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getRegistrationById(reg_id: string): Promise<Registration | null> {
  const rows = await getRows(SHEETS.REGISTRATIONS)
  const row = rows.slice(1).find(r => r[0] === reg_id)
  return row ? rowToRegistration(row) : null
}

export async function getRegistrationByLineUser(line_user_id: string, event_id?: string): Promise<Registration[]> {
  const regs = await getRegistrations(event_id)
  return regs.filter(r => r.line_user_id === line_user_id)
}

export async function createRegistration(reg: Omit<Registration, 'created_at' | 'updated_at'>): Promise<void> {
  const now = new Date().toISOString()
  await appendRow(SHEETS.REGISTRATIONS, [
    reg.reg_id, reg.event_id, reg.line_user_id, reg.line_display_name,
    reg.customer_name, reg.customer_nickname, reg.customer_phone, reg.customer_email,
    reg.ticket_type_id, reg.ticket_type_name, reg.seat_id ?? '', reg.seat_number ?? '',
    reg.seat_zone ?? '', reg.ticket_price, reg.quantity, reg.total_amount,
    reg.payment_status, reg.ticket_status,
    reg.ticket_png_url ?? '', reg.ticket_pdf_url ?? '',
    reg.checkin_status ?? 'pending', reg.checkin_at ?? '', reg.checkin_by ?? '',
    now, now,
  ])
}

export async function updateRegistration(reg_id: string, updates: Partial<Registration>): Promise<void> {
  const rows = await getRows(SHEETS.REGISTRATIONS)
  const idx = rows.findIndex(r => r[0] === reg_id)
  if (idx < 0) throw new Error('Registration not found')
  const current = rowToRegistration(rows[idx])
  const merged = { ...current, ...updates, updated_at: new Date().toISOString() }
  await updateRow(SHEETS.REGISTRATIONS, idx, [
    merged.reg_id, merged.event_id, merged.line_user_id, merged.line_display_name,
    merged.customer_name, merged.customer_nickname, merged.customer_phone, merged.customer_email,
    merged.ticket_type_id, merged.ticket_type_name, merged.seat_id ?? '', merged.seat_number ?? '',
    merged.seat_zone ?? '', merged.ticket_price, merged.quantity, merged.total_amount,
    merged.payment_status, merged.ticket_status,
    merged.ticket_png_url ?? '', merged.ticket_pdf_url ?? '',
    merged.checkin_status ?? 'pending', merged.checkin_at ?? '', merged.checkin_by ?? '',
    merged.created_at, merged.updated_at,
  ])
}

// ============================================================
// PAYMENTS
// ============================================================
function rowToPayment(row: string[]): Payment {
  return {
    payment_id:       row[0],
    reg_id:           row[1],
    event_id:         row[2],
    amount_due:       Number(row[3]) || 0,
    ocr_amount:       row[4] ? Number(row[4]) : undefined,
    ocr_transfer_date: row[5] || undefined,
    ocr_transfer_time: row[6] || undefined,
    ocr_sender_name:  row[7] || undefined,
    ocr_receiver_name: row[8] || undefined,
    ocr_bank:         row[9] || undefined,
    ocr_confidence:   row[10] ? Number(row[10]) : undefined,
    ocr_raw_text:     row[11] || undefined,
    ocr_status:       (row[12] as Payment['ocr_status']) || 'not_processed',
    slip_url:         row[13] || undefined,
    slip_drive_id:    row[14] || undefined,
    slip_filename:    row[15] || undefined,
    payment_status:   (row[16] as Payment['payment_status']) || 'pending',
    confirmed_by:     row[17] || undefined,
    confirmed_at:     row[18] || undefined,
    rejected_reason:  row[19] || undefined,
    rejection_count:  Number(row[20]) || 0,
    created_at:       row[21],
    updated_at:       row[22] || undefined,
  }
}

export async function getPayments(event_id?: string): Promise<Payment[]> {
  const rows = await getRows(SHEETS.PAYMENTS)
  if (rows.length <= 1) return []
  let payments = rows.slice(1).filter(r => r[0]).map(rowToPayment)
  if (event_id) payments = payments.filter(p => p.event_id === event_id)
  return payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getPaymentByRegId(reg_id: string): Promise<Payment | null> {
  const rows = await getRows(SHEETS.PAYMENTS)
  const row = rows.slice(1).find(r => r[1] === reg_id)
  return row ? rowToPayment(row) : null
}

export async function createPayment(payment: Payment): Promise<void> {
  await appendRow(SHEETS.PAYMENTS, [
    payment.payment_id, payment.reg_id, payment.event_id, payment.amount_due,
    payment.ocr_amount ?? '', payment.ocr_transfer_date ?? '', payment.ocr_transfer_time ?? '',
    payment.ocr_sender_name ?? '', payment.ocr_receiver_name ?? '', payment.ocr_bank ?? '',
    payment.ocr_confidence ?? '', payment.ocr_raw_text ?? '', payment.ocr_status,
    payment.slip_url ?? '', payment.slip_drive_id ?? '', payment.slip_filename ?? '',
    payment.payment_status, payment.confirmed_by ?? '', payment.confirmed_at ?? '',
    payment.rejected_reason ?? '', payment.rejection_count,
    payment.created_at, payment.updated_at ?? '',
  ])
}

export async function updatePayment(payment_id: string, updates: Partial<Payment>): Promise<void> {
  const rows = await getRows(SHEETS.PAYMENTS)
  const idx = rows.findIndex(r => r[0] === payment_id)
  if (idx < 0) {
    // find by reg_id if payment_id not found (may be stored differently)
    const idxByReg = rows.findIndex(r => r[1] === updates.reg_id)
    if (idxByReg < 0) throw new Error('Payment not found')
    const current = rowToPayment(rows[idxByReg])
    const merged = { ...current, ...updates, updated_at: new Date().toISOString() }
    await writePaymentRow(idxByReg, merged)
    return
  }
  const current = rowToPayment(rows[idx])
  const merged = { ...current, ...updates, updated_at: new Date().toISOString() }
  await writePaymentRow(idx, merged)
}

async function writePaymentRow(idx: number, p: Payment): Promise<void> {
  await updateRow(SHEETS.PAYMENTS, idx, [
    p.payment_id, p.reg_id, p.event_id, p.amount_due,
    p.ocr_amount ?? '', p.ocr_transfer_date ?? '', p.ocr_transfer_time ?? '',
    p.ocr_sender_name ?? '', p.ocr_receiver_name ?? '', p.ocr_bank ?? '',
    p.ocr_confidence ?? '', p.ocr_raw_text ?? '', p.ocr_status,
    p.slip_url ?? '', p.slip_drive_id ?? '', p.slip_filename ?? '',
    p.payment_status, p.confirmed_by ?? '', p.confirmed_at ?? '',
    p.rejected_reason ?? '', p.rejection_count,
    p.created_at, p.updated_at ?? '',
  ])
}

// ============================================================
// STAFFS
// ============================================================
function rowToStaff(row: string[]): Staff {
  return {
    staff_id:      row[0],
    line_user_id:  row[1] || undefined,
    staff_name:    row[2],
    role:          (row[3] as Staff['role']) || 'staff',
    phone:         row[4] || undefined,
    email:         row[5] || undefined,
    password_hash: row[6] || undefined,
    token:         row[7] || undefined,
    status:        (row[8] as Staff['status']) || 'active',
    created_at:    row[9],
    created_by:    row[10],
    last_login:    row[11] || undefined,
  }
}

export async function getStaffs(): Promise<Staff[]> {
  const rows = await getRows(SHEETS.STAFFS)
  if (rows.length <= 1) return []
  return rows.slice(1).filter(r => r[0]).map(rowToStaff)
}

export async function getStaffById(staff_id: string): Promise<Staff | null> {
  const staffs = await getStaffs()
  return staffs.find(s => s.staff_id === staff_id) ?? null
}

export async function getStaffByEmail(email: string): Promise<Staff | null> {
  const staffs = await getStaffs()
  return staffs.find(s => s.email === email) ?? null
}

export async function getStaffByLineUserId(line_user_id: string): Promise<Staff | null> {
  const staffs = await getStaffs()
  return staffs.find(s => s.line_user_id === line_user_id) ?? null
}

export async function createStaff(staff: Staff): Promise<void> {
  await appendRow(SHEETS.STAFFS, [
    staff.staff_id, staff.line_user_id ?? '', staff.staff_name, staff.role,
    staff.phone ?? '', staff.email ?? '', staff.password_hash ?? '',
    staff.token ?? '', staff.status, staff.created_at, staff.created_by, staff.last_login ?? '',
  ])
}

export async function updateStaff(staff_id: string, updates: Partial<Staff>): Promise<void> {
  const rows = await getRows(SHEETS.STAFFS)
  const idx = rows.findIndex(r => r[0] === staff_id)
  if (idx < 0) throw new Error('Staff not found')
  const current = rowToStaff(rows[idx])
  const merged = { ...current, ...updates }
  await updateRow(SHEETS.STAFFS, idx, [
    merged.staff_id, merged.line_user_id ?? '', merged.staff_name, merged.role,
    merged.phone ?? '', merged.email ?? '', merged.password_hash ?? '',
    merged.token ?? '', merged.status, merged.created_at, merged.created_by, merged.last_login ?? '',
  ])
}

// ============================================================
// CHECKINS
// ============================================================
function rowToCheckIn(row: string[]): CheckIn {
  return {
    checkin_id:    row[0],
    reg_id:        row[1],
    event_id:      row[2],
    line_user_id:  row[3],
    customer_name: row[4],
    seat_number:   row[5] || undefined,
    ticket_type:   row[6],
    checkin_at:    row[7],
    checkin_by:    row[8],
    checkin_method: (row[9] as CheckIn['checkin_method']) || 'qr_scan',
    device_info:   row[10] || undefined,
  }
}

export async function getCheckIns(event_id?: string): Promise<CheckIn[]> {
  const rows = await getRows(SHEETS.CHECKINS)
  if (rows.length <= 1) return []
  let checkins = rows.slice(1).filter(r => r[0]).map(rowToCheckIn)
  if (event_id) checkins = checkins.filter(c => c.event_id === event_id)
  return checkins
}

export async function createCheckIn(checkin: CheckIn): Promise<void> {
  await appendRow(SHEETS.CHECKINS, [
    checkin.checkin_id, checkin.reg_id, checkin.event_id, checkin.line_user_id,
    checkin.customer_name, checkin.seat_number ?? '', checkin.ticket_type,
    checkin.checkin_at, checkin.checkin_by, checkin.checkin_method, checkin.device_info ?? '',
  ])
}

// ============================================================
// SETTINGS
// ============================================================
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await getRows(SHEETS.SETTINGS)
  const result: Record<string, string> = {}
  rows.slice(1).filter(r => r[0]).forEach(r => { result[r[0]] = r[1] })
  return result
}

export async function getSetting(key: string): Promise<string | null> {
  const settings = await getSettings()
  return settings[key] ?? null
}

export async function setSetting(key: string, value: string, updatedBy = 'system'): Promise<void> {
  const rows = await getRows(SHEETS.SETTINGS)
  const idx = rows.findIndex(r => r[0] === key)
  const now = new Date().toISOString()
  if (idx < 0) {
    await appendRow(SHEETS.SETTINGS, [key, value, '', now, updatedBy])
  } else {
    await updateRow(SHEETS.SETTINGS, idx, [key, value, rows[idx][2] ?? '', now, updatedBy])
  }
}

// ============================================================
// AUDIT LOGS
// ============================================================
export async function createAuditLog(log: Omit<AuditLog, 'log_id' | 'created_at'>): Promise<void> {
  const { v4: uuidv4 } = await import('uuid')
  await appendRow(SHEETS.AUDIT_LOGS, [
    uuidv4(), log.action, log.actor_id, log.actor_name,
    log.target_type, log.target_id, log.details ?? '', new Date().toISOString(),
  ])
}

// ============================================================
// Initialize sheets with headers if empty
// ============================================================
export async function initializeSheets(): Promise<void> {
  const sheets = await getSheetsClient()

  const headerMap: Record<string, string[]> = {
    [SHEETS.EVENTS]: ['event_id','event_name','event_date','event_end_date','event_venue','event_description','event_image','ticket_mode','max_capacity','status','promptpay_number','banner_url','reservation_timeout','created_at','updated_at'],
    [SHEETS.TICKETS]: ['ticket_id','event_id','ticket_type','ticket_name','ticket_price','ticket_quota','ticket_sold','ticket_color','ticket_description','status','sort_order'],
    [SHEETS.SEATS]: ['seat_id','event_id','seat_number','seat_zone','seat_row','seat_col','ticket_type_id','seat_type','price','status','reserved_by','reserved_at','expires_at','reg_id','display_label'],
    [SHEETS.REGISTRATIONS]: ['reg_id','event_id','line_user_id','line_display_name','customer_name','customer_nickname','customer_phone','customer_email','ticket_type_id','ticket_type_name','seat_id','seat_number','seat_zone','ticket_price','quantity','total_amount','payment_status','ticket_status','ticket_png_url','ticket_pdf_url','checkin_status','checkin_at','checkin_by','created_at','updated_at'],
    [SHEETS.PAYMENTS]: ['payment_id','reg_id','event_id','amount_due','ocr_amount','ocr_transfer_date','ocr_transfer_time','ocr_sender_name','ocr_receiver_name','ocr_bank','ocr_confidence','ocr_raw_text','ocr_status','slip_url','slip_drive_id','slip_filename','payment_status','confirmed_by','confirmed_at','rejected_reason','rejection_count','created_at','updated_at'],
    [SHEETS.STAFFS]: ['staff_id','line_user_id','staff_name','role','phone','email','password_hash','token','status','created_at','created_by','last_login'],
    [SHEETS.CHECKINS]: ['checkin_id','reg_id','event_id','line_user_id','customer_name','seat_number','ticket_type','checkin_at','checkin_by','checkin_method','device_info'],
    [SHEETS.SETTINGS]: ['key','value','description','updated_at','updated_by'],
    [SHEETS.AUDIT_LOGS]: ['log_id','action','actor_id','actor_name','target_type','target_id','details','created_at'],
  }

  // Get existing sheet names
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' })
  const existingSheets = new Set((meta.data.sheets ?? []).map((s: { properties?: { title?: string } }) => s.properties?.title ?? ''))

  for (const [sheetName, headers] of Object.entries(headerMap)) {
    try {
      // Create sheet tab if it doesn't exist
      if (!existingSheets.has(sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
        })
        existingSheets.add(sheetName)
      }

      // Write headers if row 1 is empty
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID, range: `${sheetName}!A1:A1`,
      })
      if (!res.data.values || res.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID, range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] },
        })
      }
    } catch (err) {
      console.error(`initializeSheets: error on sheet "${sheetName}":`, err)
    }
  }
}
