'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { QrCode, Search, CheckCircle2, XCircle, AlertCircle, UserCheck, Camera, X } from 'lucide-react'

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

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const detectedRef = useRef(false)

  const extractRegId = (raw: string): string => {
    const match = raw.match(/reg_id=([A-Z0-9\-]+)/i)
    if (match) return match[1]
    return raw.trim()
  }

  const handleVerify = useCallback(async (raw?: string) => {
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
  }, [input])

  const handleCheckIn = async () => {
    if (!lastRegId) return
    setCheckingIn(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_id: lastRegId, method: cameraOpen ? 'qr_scan' : 'manual' }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setResult({ status: 'OK', ...d.data })
      showToast('success', `Check-in สำเร็จ: ${d.data.customer_name}`)
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

  // ── Camera scanning ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
    setCameraError('')
    detectedRef.current = false
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    detectedRef.current = false
    setCameraOpen(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Load jsQR dynamically
      const jsQR = (await import('jsqr')).default

      scanIntervalRef.current = setInterval(() => {
        if (detectedRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== 4) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code?.data) {
          detectedRef.current = true
          const regId = extractRegId(code.data)
          setInput(regId)
          stopCamera()
          handleVerify(regId)
        }
      }, 200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setCameraError('กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์')
      } else if (msg.includes('NotFound')) {
        setCameraError('ไม่พบกล้องในอุปกรณ์นี้')
      } else {
        setCameraError('ไม่สามารถเปิดกล้องได้')
      }
    }
  }, [handleVerify, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

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
            <p className="text-center text-emerald-600 text-sm font-medium mt-3">✓ Check-in สำเร็จ!</p>
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
                  if (e.target.value.includes('reg_id=') || e.target.value.length > 10) {
                    setTimeout(() => handleVerify(e.target.value), 100)
                  }
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleVerify()}
                disabled={checking || !input}
                className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checking
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <Search className="w-5 h-5"/>
                }
                {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ'}
              </button>

              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm"
                title="เปิดกล้องสแกน QR"
              >
                <Camera className="w-5 h-5"/>
                กล้อง
              </button>
            </div>
          </div>
        </div>

        {result && <ResultCard/>}

        {!result && (
          <div className="card p-4 bg-blue-50 border border-blue-100">
            <h4 className="font-semibold text-blue-800 text-sm mb-2">วิธีใช้งาน</h4>
            <ol className="space-y-1.5 text-blue-700 text-sm">
              <li>1. กดปุ่ม <strong>กล้อง</strong> เพื่อสแกน QR Code หรือป้อนรหัสด้วยตนเอง</li>
              <li>2. ระบบจะแสดงผลการตรวจสอบอัตโนมัติ</li>
              <li>3. กด &quot;Check-in&quot; เพื่อบันทึกการเข้างาน</li>
            </ol>
          </div>
        )}
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-black rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
              <span className="text-white font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-400"/>
                สแกน QR Code
              </span>
              <button onClick={stopCamera} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6"/>
              </button>
            </div>

            {/* Camera view */}
            {cameraError ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3"/>
                <p className="text-white text-sm">{cameraError}</p>
                <button onClick={stopCamera} className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-xl text-sm">
                  ปิด
                </button>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full"
                  playsInline
                  muted
                />
                {/* Scan frame overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-green-400 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"/>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"/>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"/>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"/>
                    {/* Scanning line animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-green-400 animate-bounce" style={{ top: '50%' }}/>
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden"/>
                <p className="text-center text-white/70 text-sm py-3">
                  จ่ายกล้องไปที่ QR Code บนบัตร
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
