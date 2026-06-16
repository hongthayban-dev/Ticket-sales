// ============================================================
// Event Types
// ============================================================
export type TicketMode = 'ticket_type' | 'seat_map'
export type EventStatus = 'draft' | 'active' | 'closed' | 'cancelled'

export interface Event {
  event_id: string
  event_name: string
  event_date: string
  event_end_date?: string
  event_venue: string
  event_description: string
  event_image?: string
  ticket_mode: TicketMode
  max_capacity: number
  status: EventStatus
  promptpay_number?: string
  promptpay_qr_url?: string
  banner_url?: string
  reservation_timeout: number  // minutes
  created_at: string
  updated_at?: string
}

// ============================================================
// Ticket Type (for ticket_type mode)
// ============================================================
export type TicketStatus = 'active' | 'inactive' | 'soldout'

export interface TicketType {
  ticket_id: string
  event_id: string
  ticket_type: string
  ticket_name: string
  ticket_price: number
  ticket_quota: number
  ticket_sold: number
  ticket_remaining: number
  ticket_color: string
  ticket_description?: string
  status: TicketStatus
  sort_order: number
}

// ============================================================
// Seat (for seat_map mode)
// ============================================================
export type SeatStatus = 'available' | 'reserved' | 'pending_payment' | 'paid' | 'checked_in'

export interface Seat {
  seat_id: string
  event_id: string
  seat_number: string
  seat_zone: string
  seat_row: string
  seat_col: number
  ticket_type_id: string
  seat_type: string
  price: number
  status: SeatStatus
  reserved_by?: string
  reserved_at?: string
  expires_at?: string
  reg_id?: string
  display_label?: string
}

// ============================================================
// Registration
// ============================================================
export type PaymentStatus = 'pending' | 'pending_payment' | 'uploading' | 'verifying' | 'paid' | 'rejected' | 'cancelled'
export type TicketGenStatus = 'not_generated' | 'generating' | 'sent' | 'failed'

export interface Registration {
  reg_id: string
  event_id: string
  line_user_id: string
  line_display_name: string
  customer_name: string
  customer_nickname: string
  customer_phone: string
  customer_email: string
  ticket_type_id: string
  ticket_type_name: string
  seat_id?: string
  seat_number?: string
  seat_zone?: string
  ticket_price: number
  quantity: number
  total_amount: number
  payment_status: PaymentStatus
  ticket_status: TicketGenStatus
  ticket_png_url?: string
  ticket_pdf_url?: string
  checkin_status?: 'pending' | 'checked_in'
  checkin_at?: string
  checkin_by?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Payment & OCR
// ============================================================
export type OcrStatus = 'not_processed' | 'success' | 'partial' | 'failed'
export type PaymentVerifyStatus = 'pending' | 'verified' | 'rejected'

export interface Payment {
  payment_id: string
  reg_id: string
  event_id: string
  amount_due: number
  ocr_amount?: number
  ocr_transfer_date?: string
  ocr_transfer_time?: string
  ocr_sender_name?: string
  ocr_receiver_name?: string
  ocr_bank?: string
  ocr_confidence?: number
  ocr_raw_text?: string
  ocr_status: OcrStatus
  slip_url?: string
  slip_drive_id?: string
  slip_filename?: string
  payment_status: PaymentVerifyStatus
  confirmed_by?: string
  confirmed_at?: string
  rejected_reason?: string
  rejection_count: number
  created_at: string
  updated_at?: string
}

// ============================================================
// Staff / Admin
// ============================================================
export type StaffRole = 'super_admin' | 'admin' | 'staff'
export type StaffStatus = 'active' | 'inactive' | 'suspended'

export interface Staff {
  staff_id: string
  line_user_id?: string
  staff_name: string
  role: StaffRole
  phone?: string
  email?: string
  password_hash?: string
  token?: string
  status: StaffStatus
  created_at: string
  created_by: string
  last_login?: string
}

// ============================================================
// Check-in
// ============================================================
export interface CheckIn {
  checkin_id: string
  reg_id: string
  event_id: string
  line_user_id: string
  customer_name: string
  seat_number?: string
  ticket_type: string
  checkin_at: string
  checkin_by: string
  checkin_method: 'qr_scan' | 'manual'
  device_info?: string
}

// ============================================================
// Settings
// ============================================================
export interface Setting {
  key: string
  value: string
  description?: string
  updated_at?: string
  updated_by?: string
}

// ============================================================
// Audit Log
// ============================================================
export interface AuditLog {
  log_id: string
  action: string
  actor_id: string
  actor_name: string
  target_type: string
  target_id: string
  details?: string
  created_at: string
}

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// ============================================================
// Auth Types
// ============================================================
export interface AuthPayload {
  staff_id: string
  staff_name: string
  role: StaffRole
  line_user_id?: string
  iat?: number
  exp?: number
}

// ============================================================
// Registration Form
// ============================================================
export interface RegistrationFormData {
  event_id: string
  customer_name: string
  customer_nickname: string
  customer_phone: string
  customer_email: string
  ticket_type_id?: string
  seat_id?: string
  quantity: number
}

// ============================================================
// Dashboard Stats
// ============================================================
export interface DashboardStats {
  total_registrations: number
  paid_registrations: number
  pending_registrations: number
  rejected_registrations: number
  total_revenue: number
  tickets_remaining?: number
  checked_in: number
}
