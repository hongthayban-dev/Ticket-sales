'use client'

import { getPaymentStatusLabel, getPaymentStatusColor } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function PaymentStatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(status)} ${className}`}>
      {getPaymentStatusLabel(status)}
    </span>
  )
}

export function CheckinStatusBadge({ status }: { status: string }) {
  if (status === 'checked_in') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
        เช็คอินแล้ว
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      รอเช็คอิน
    </span>
  )
}
