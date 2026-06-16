'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LiffProvider, useLiff } from '@/components/liff/LiffProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Ticket, QrCode, ExternalLink } from 'lucide-react'
import type { Registration } from '@/types'

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2010405513-QHMDmGF3'

function MyTicketsContent() {
  const { profile } = useLiff()
  const router = useRouter()
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    fetch(`/api/me?line_user_id=${profile.userId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setRegs(d.data) })
      .finally(() => setLoading(false))
  }, [profile])

  return (
    <div className="liff-container min-h-screen">
      <div className="gradient-header text-white px-4 pt-5 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <h1 className="font-bold text-lg">บัตรของฉัน</h1>
        </div>
      </div>

      <div className="px-4 py-5">
        {loading && <LoadingSpinner text="กำลังโหลด..."/>}

        {!loading && regs.length === 0 && (
          <div className="text-center py-16">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
            <h3 className="font-bold text-gray-700 mb-2">ยังไม่มีบัตร</h3>
            <p className="text-gray-500 text-sm">คุณยังไม่ได้ลงทะเบียนงานใด</p>
            <button onClick={() => router.push('/')} className="btn-primary mt-4 px-6">
              ดูงานทั้งหมด
            </button>
          </div>
        )}

        <div className="space-y-4">
          {regs.map(reg => (
            <div key={reg.reg_id} className="card overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1.5 gradient-header"/>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-mono text-xs text-gray-400">{reg.reg_id}</p>
                    <p className="font-bold text-gray-900">{reg.ticket_type_name}</p>
                    {reg.seat_number && (
                      <p className="text-primary-600 font-bold text-lg">{reg.seat_number}</p>
                    )}
                  </div>
                  <PaymentStatusBadge status={reg.payment_status}/>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p>ผู้ลงทะเบียน: <span className="font-medium text-gray-900">{reg.customer_name}</span></p>
                  <p>ยอดชำระ: <span className="font-bold text-primary-600">{formatCurrency(reg.total_amount)}</span></p>
                  <p>ลงทะเบียนเมื่อ: {formatDate(reg.created_at)}</p>
                </div>

                {reg.payment_status === 'paid' && reg.ticket_png_url && (
                  <div className="flex gap-2">
                    <a
                      href={reg.ticket_png_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold"
                    >
                      <Ticket className="w-4 h-4"/>
                      ดูบัตร
                    </a>
                    {reg.ticket_pdf_url && (
                      <a
                        href={reg.ticket_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 py-2.5 px-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold"
                      >
                        <ExternalLink className="w-4 h-4"/>
                        PDF
                      </a>
                    )}
                  </div>
                )}

                {reg.payment_status === 'pending_payment' && (
                  <button
                    onClick={() => router.push(`/payment/${reg.reg_id}`)}
                    className="w-full py-2.5 rounded-xl bg-yellow-500 text-white text-sm font-semibold"
                  >
                    ชำระเงิน
                  </button>
                )}

                {reg.payment_status === 'rejected' && (
                  <button
                    onClick={() => router.push(`/payment/${reg.reg_id}`)}
                    className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold"
                  >
                    อัปโหลดสลิปใหม่
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MyTicketsPage() {
  return (
    <LiffProvider liffId={LIFF_ID}>
      <MyTicketsContent/>
    </LiffProvider>
  )
}
