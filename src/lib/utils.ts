import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      ...options,
    })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function generateRegId(eventId: string): string {
  const short = eventId.slice(0, 4).toUpperCase()
  const ts = Date.now().toString(36).slice(-4).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${short}-${ts}${rand}`
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone
  return phone.slice(0, 3) + 'xxxx' + phone.slice(-3)
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function getPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'รอดำเนินการ',
    pending_payment: 'รอชำระเงิน',
    uploading: 'กำลังอัปโหลด',
    verifying: 'รอตรวจสอบ',
    paid: 'ชำระแล้ว',
    rejected: 'ถูกปฏิเสธ',
    cancelled: 'ยกเลิก',
  }
  return map[status] || status
}

export function getPaymentStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    pending_payment: 'bg-yellow-100 text-yellow-700',
    uploading: 'bg-blue-100 text-blue-700',
    verifying: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

export function getSeatStatusColor(status: string): string {
  const map: Record<string, string> = {
    available: '#22c55e',
    reserved: '#f59e0b',
    pending_payment: '#f97316',
    paid: '#3b82f6',
    checked_in: '#6b7280',
  }
  return map[status] || '#9ca3af'
}

export function getOcrStatusLabel(status: string): string {
  const map: Record<string, string> = {
    not_processed: 'ยังไม่ประมวลผล',
    success: 'อ่านสำเร็จ',
    partial: 'อ่านได้บางส่วน',
    failed: 'อ่านไม่ได้',
  }
  return map[status] || status
}
