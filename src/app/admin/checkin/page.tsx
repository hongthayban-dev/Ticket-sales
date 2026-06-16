'use client'

import { useState, useRef } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { QrCode, Search, CheckCircle2, XCircle, AlertCircle, UserCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CheckResult {
  status: 'OK' | 'NOT_FOUND' | 'NOT_PAID' | 'ALREADY_CHECKED_IN' | null
  customer_name?: string
  customer_nickname?: string
  ticket_type?: string
  seat_number?: string
  checkin_at?: string
  checkin_by?: string
  payment_status?: string
}

export default function CheckinPage() {
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [checking_in, setCheckingIn] = useState(false)
  const [lastRegId, setLastRegId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const extractRegId = (raw: string): string => {
    // Support QR code URL format: /checkin?reg_id=XXX
    const match = raw.match(/reg_id=([A-Z0-9\-]+)/i)
    if (match) return match[1]
    return raw.trim()
  }

  const handleVerify = async (raw?: string) => {
    const value = raw || input
    const reg_id = extractRegId(value)
    if (!reg_id) return
    setLastRegId(reg_id)
    setChecking(true)
    setResult(null)

    try {
      const res = await fetch(`/api/checkin?reg_id=${reg_id}`)
      const d = await res.json()
      if (d.success) {
        setResult({ status: 'OK', ...d.data })
      } else {
        setResult({ status: d.data?.status || 'NOT_FOUND', ...d.data })
      }
    } catch {
      showToast('error', 'ไม่สามารถตรวจสอบได้')
    } finally {
      setChecking(false)
    }
  }

  const handleCheckIn = async () => {
    if (!lastRegId) return
    setCheckingIn(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_id: lastRegId, method: 'manual' }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setResult({ status: 'OK', ...d.data })
      showToast('success', `Check-in สำเร็จ: ${d.data.customer_name}`)
      // Auto-clear after 3s for next scan
      setTimeout(() => {
        setInput('')
        setResult(null)
        inputRef.current?.focus()
      }, 3000)
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify()
  }

  const ResultCard = () => {
    if (!result) return null

    if (result.status === 'NOT_FOUND') {
      return (
        <div className="card p-6 text-center border-l-4 border-l-red-500">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3"/>
          <h3 className="text-xl font-bold text-red-700 mb-1">ไม่พบบัตรนี้</h3>
          <p className="text-gray-500 text-sm">รหัส: {lastRegId}</p>
        </div>
      )
    }

    if (result.status === 'NOT_PAID') {
      return (
        <div className="card p-6 text-center border-l-4 border-l-amber-500">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-3"/>
          <h3 className="text-xl font-bold text-amber-700 mb-1">ยังไม่ชำระเงิน</h3>
          <p className="text-gray-600 text-sm mb-2">{result.customer_name}</p>
          <p className="text-gray-400 text-xs">สถานะ: {result.payment_status}</p>
        </div>
      )
    }

    if (result.status === 'ALREADY_CHECKED_IN') {
      return (
        <div className="card p-6 text-center border-l-4 border-l-gray-400">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-3"/>
          <h3 className="text-xl font-bold text-gray-700 mb-1">Check-in แล้ว</h3>
          <p className="text-gray-600 font-medium mb-1">{result.customer_name}</p>
          <p className="text-gray-400 text-xs">เช็คอินเมื่อ: {result.checkin_at}</p>
          <p className="text-gray-400 text-xs">โดย: {result.checkin_by}</p>
        </div>
      )
    }

    if (result.status === 'OK') {
      return (
        <div className="card p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 flex-shrink-0"/>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-emerald-700 mb-3">ผ่านการตรวจสอบ</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">ชื่อ</span>
                  <span className="font-bold text-gray-900">{result.customer_name}</span>
                </div>
                {result.customer_nickname && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">ชื่อเล่น</span>
                    <span className="font-medium">{result.customer_nickname}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">ประเภทบัตร</span>
                  <span className="font-bold text-primary-600">{result.ticket_type}</span>
                </div>
                {result.seat_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">ที่นั่ง</span>
                    <span className="font-bold text-primary-800 text-xl">{result.seat_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!result.checkin_at && (
            <button
              onClick={handleCheckIn}
              disabled={checking_in}
              className="mt-4 w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5"/>
              {checking_in ? 'กำลัง Check-in...' : 'กดเพื่อ Check-in'}
            </button>
          )}
          {result.checkin_at && (
            <p className="text-center text-emerald-600 text-sm font-medium mt-3">
              ✓ Check-in สำเร็จ!
            </p>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <AdminLayout title="ระบบ Check-in">
      <ToastProvider/>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Input area */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary-600"/>
            สแกน / ป้อนรหัส
          </h2>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
              <input
                ref={inputRef}
                type="text"
                className="input-field pl-10 text-lg"
                placeholder="ป้อนรหัสหรือสแกน QR..."
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  // Auto-submit if it looks like a QR code scan (contains URL or is long enough)
                  if (e.target.value.includes('reg_id=') || e.target.value.length > 10) {
                    setTimeout(() => handleVerify(e.target.value), 100)
                  }
                }}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <button
              onClick={() => handleVerify()}
              disabled={checking || !input}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checking ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : (
                <Search className="w-5 h-5"/>
              )}
              {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ'}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && <ResultCard/>}

        {/* Quick guide */}
        {!result && (
          <div className="card p-4 bg-blue-50 border border-blue-100">
            <h4 className="font-semibold text-blue-800 text-sm mb-2">วิธีใช้งาน</h4>
            <ol className="space-y-1.5 text-blue-700 text-sm">
              <li>1. สแกน QR Code จากบัตรลูกค้า หรือป้อนรหัสด้วยตนเอง</li>
              <li>2. ระบบจะแสดงผลการตรวจสอบ</li>
              <li>3. กด "Check-in" เพื่อบันทึกการเข้างาน</li>
              <li>4. รอสักครู่ระบบจะพร้อมสำหรับการสแกนครั้งถัดไป</li>
            </ol>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
