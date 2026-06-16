'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Ticket } from 'lucide-react'

function CheckinVerifyPageContent() {
  const searchParams = useSearchParams()
  const reg_id = searchParams.get('reg_id')

  const [status, setStatus] = useState<'loading' | 'found' | 'not_found' | 'already_checked_in' | 'not_paid'>('loading')
  const [data, setData] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!reg_id) {
      setStatus('not_found')
      return
    }
    fetch(`/api/checkin?reg_id=${reg_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data)
          if (d.data.checkin_status === 'checked_in') setStatus('already_checked_in')
          else if (d.data.payment_status !== 'paid') setStatus('not_paid')
          else setStatus('found')
        } else {
          setStatus('not_found')
        }
      })
      .catch(() => setStatus('not_found'))
  }, [reg_id])

  const bgClass = {
    loading: 'bg-blue-50',
    found: 'bg-emerald-50',
    not_found: 'bg-red-50',
    already_checked_in: 'bg-gray-50',
    not_paid: 'bg-amber-50',
  }[status]

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${bgClass}`}>
      <div className="card max-w-sm w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-gray-600">กำลังตรวจสอบบัตร...</p>
          </>
        )}

        {status === 'found' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4"/>
            <h2 className="text-2xl font-bold text-emerald-700 mb-4">บัตรถูกต้อง</h2>
            <div className="space-y-2 text-sm text-left bg-emerald-50 rounded-xl p-4">
              <div className="flex justify-between">
                <span className="text-gray-500">ชื่อ</span>
                <span className="font-bold">{data.customer_name}</span>
              </div>
              {data.customer_nickname && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ชื่อเล่น</span>
                  <span className="font-medium">{data.customer_nickname}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">บัตร</span>
                <span className="font-bold text-primary-700">{data.ticket_type}</span>
              </div>
              {data.seat_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ที่นั่ง</span>
                  <span className="font-bold text-2xl text-primary-800">{data.seat_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">รหัส</span>
                <span className="font-mono text-xs">{reg_id}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">ใช้หน้า Admin &gt; Check-in เพื่อบันทึกการเข้างาน</p>
          </>
        )}

        {status === 'already_checked_in' && (
          <>
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
            <h2 className="text-xl font-bold text-gray-600 mb-2">Check-in แล้ว</h2>
            <p className="text-gray-500 text-sm mb-3">{data.customer_name}</p>
            <p className="text-xs text-gray-400">เข้างานเมื่อ: {data.checkin_at}</p>
          </>
        )}

        {status === 'not_paid' && (
          <>
            <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4"/>
            <h2 className="text-xl font-bold text-amber-700 mb-2">ยังไม่ชำระเงิน</h2>
            <p className="text-sm text-gray-600">{data.customer_name}</p>
          </>
        )}

        {status === 'not_found' && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4"/>
            <h2 className="text-xl font-bold text-red-700 mb-2">ไม่พบบัตรนี้</h2>
            <p className="text-sm text-gray-500">รหัส: {reg_id || 'ไม่ระบุ'}</p>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <Ticket className="w-4 h-4"/>
            <span>Ticket sales</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckinVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-blue-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <CheckinVerifyPageContent />
    </Suspense>
  )
}
