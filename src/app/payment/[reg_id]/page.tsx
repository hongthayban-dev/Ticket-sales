'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiffProvider, useLiff } from '@/components/liff/LiffProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Upload, CheckCircle2, AlertCircle,
  Clock, Image as ImageIcon, X, QrCode
} from 'lucide-react'

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2010308553-AKbYOyq3'

interface QrData {
  qr_image: string | null
  amount: number
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

function PaymentContent() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useLiff()
  const reg_id = params.reg_id as string

  const [qrData, setQrData] = useState<QrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/payment/qr?reg_id=${reg_id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setQrData(d.data) })
      .finally(() => setLoading(false))
  }, [reg_id])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ไฟล์ต้องมีขนาดไม่เกิน 10MB')
      return
    }
    setSlipFile(file)
    setErrorMsg('')
    const reader = new FileReader()
    reader.onload = e => setSlipPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!slipFile) return
    setUploadStatus('uploading')
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('reg_id', reg_id)
      formData.append('slip', slipFile)

      const res = await fetch('/api/payment/upload-slip', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUploadStatus('success')
    } catch (err: unknown) {
      setUploadStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลด')
    }
  }

  if (loading) return <LoadingSpinner fullScreen text="กำลังโหลด QR Code..."/>

  if (uploadStatus === 'success') {
    return (
      <div className="liff-container min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-14 h-14 text-emerald-500"/>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">ส่งสลิปสำเร็จ!</h2>
        <p className="text-gray-600 mb-2">ระบบได้รับสลิปของคุณแล้ว</p>
        <p className="text-gray-500 text-sm mb-8">
          เจ้าหน้าที่กำลังตรวจสอบการชำระเงิน<br/>
          คุณจะได้รับบัตรผ่าน LINE ภายหลัง
        </p>
        <div className="card p-4 w-full mb-6 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary-500"/>
            <span className="text-sm font-semibold text-gray-700">รหัสการลงทะเบียน</span>
          </div>
          <p className="font-mono font-bold text-primary-600 text-lg">{reg_id}</p>
        </div>
        <button onClick={() => router.push('/')} className="btn-secondary w-full">
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="liff-container min-h-screen pb-32">
      {/* Header */}
      <div className="gradient-header text-white px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <h1 className="font-bold text-lg">ชำระเงิน</h1>
        </div>
        <div className="bg-white/15 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-xs">รหัส</p>
            <p className="text-white font-mono font-bold">{reg_id}</p>
          </div>
          <div className="text-right">
            <p className="text-primary-100 text-xs">ยอดที่ต้องชำระ</p>
            <p className="text-white font-bold text-xl">{formatCurrency(qrData?.amount ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* QR Code */}
        <div className="card p-5 text-center">
          <p className="text-gray-700 font-semibold mb-1">สแกน QR Code เพื่อชำระเงิน</p>
          <p className="text-gray-400 text-xs mb-4">รองรับทุกธนาคารผ่าน PromptPay</p>

          {qrData?.qr_image ? (
            <div className="flex justify-center mb-4">
              <div className="border-4 border-primary-500 rounded-2xl p-2 bg-white shadow-lg">
                <img src={qrData.qr_image} alt="QR Code PromptPay"
                  className="w-56 h-56 object-contain"/>
              </div>
            </div>
          ) : (
            <div className="w-56 h-56 bg-gray-100 rounded-2xl mx-auto mb-4 flex flex-col items-center justify-center gap-2">
              <QrCode className="w-10 h-10 text-gray-300"/>
              <p className="text-gray-400 text-sm">ยังไม่มี QR Code</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0"/>
            <p className="text-yellow-700 text-xs">โปรดโอนเงินจำนวน <strong>{formatCurrency(qrData?.amount ?? 0)}</strong> ให้ตรงกับยอดที่แสดง</p>
          </div>
        </div>

        {/* Upload slip */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-1">อัปโหลดสลิปการโอนเงิน</h3>
          <p className="text-gray-500 text-xs mb-4">หลังโอนเงินแล้ว ถ่ายภาพสลิปและอัปโหลดที่นี่</p>

          {/* File picker area */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`
              border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
              ${slipPreview
                ? 'border-primary-300 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }
            `}
          >
            {slipPreview ? (
              <div className="relative">
                <img src={slipPreview} alt="slip" className="max-h-64 mx-auto rounded-xl object-contain"/>
                <button
                  onClick={e => { e.stopPropagation(); setSlipPreview(null); setSlipFile(null) }}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
                >
                  <X className="w-4 h-4"/>
                </button>
                <p className="text-primary-600 text-sm font-medium mt-3">แตะเพื่อเปลี่ยนรูป</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-7 h-7 text-gray-400"/>
                </div>
                <p className="text-gray-600 font-medium text-sm">แตะเพื่อเลือกรูปสลิป</p>
                <p className="text-gray-400 text-xs mt-1">รองรับ JPG, PNG ขนาดไม่เกิน 10MB</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {errorMsg && (
            <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
              <AlertCircle className="w-4 h-4"/>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Steps guide */}
        <div className="card p-4">
          <h4 className="font-semibold text-gray-700 text-sm mb-3">ขั้นตอน</h4>
          <div className="space-y-3">
            {[
              { n: 1, text: 'สแกน QR Code ด้วย app ธนาคารของคุณ' },
              { n: 2, text: `โอนเงินจำนวน ${formatCurrency(qrData?.amount ?? 0)}` },
              { n: 3, text: 'ถ่ายภาพสลิปการโอนเงิน' },
              { n: 4, text: 'อัปโหลดสลิปด้านบนแล้วกดยืนยัน' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {n}
                </div>
                <p className="text-gray-600 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <div className="max-w-sm mx-auto">
          <button
            onClick={handleUpload}
            disabled={!slipFile || uploadStatus === 'uploading'}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {uploadStatus === 'uploading' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                กำลังอัปโหลด...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5"/>
                ส่งสลิปการโอนเงิน
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <LiffProvider liffId={LIFF_ID}>
      <PaymentContent/>
    </LiffProvider>
  )
}
