'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { showToast, ToastProvider } from '@/components/ui/Toast'
import { formatCurrency, formatDateTime, getOcrStatusLabel } from '@/lib/utils'
import {
  Search, RefreshCw, CheckCircle2, XCircle, Eye,
  AlertCircle, TrendingUp, TrendingDown,
  ExternalLink, Send
} from 'lucide-react'
import type { Registration, Payment } from '@/types'

type RegWithPayment = Registration & { payment?: Payment }

export default function PaymentsPage() {
  const [items, setItems] = useState<RegWithPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<RegWithPayment | null>(null)
  const [confirmType, setConfirmType] = useState<'confirm' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [resending, setResending] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`)
      const d = await res.json()
      if (d.success) setItems(d.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filterStatus])

  const filtered = items.filter(item =>
    search === '' ||
    item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    item.reg_id.toLowerCase().includes(search.toLowerCase()) ||
    (item.customer_email || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = async () => {
    if (!selected) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/payments/${selected.reg_id}/confirm`, { method: 'POST' })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      showToast('success', 'ยืนยันการชำระเงินและส่งบัตรสำเร็จ')
      setConfirmType(null)
      setDetailOpen(false)
      fetchData()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const handleResend = async (reg_id: string) => {
    setResending(true)
    try {
      const res = await fetch(`/api/admin/payments/${reg_id}/resend`, { method: 'POST' })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      showToast('success', 'ส่งอีเมลสำเร็จ')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'ส่งอีเมลไม่สำเร็จ')
    } finally {
      setResending(false)
    }
  }

  const handleReject = async () => {
    if (!selected || !rejectReason) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/payments/${selected.reg_id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      showToast('success', 'ปฏิเสธการชำระเงินแล้ว')
      setConfirmType(null)
      setDetailOpen(false)
      setRejectReason('')
      fetchData()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const OcrMatch = ({ payment }: { payment?: Payment }) => {
    if (!payment || !payment.ocr_amount || !payment.amount_due) return (
      <span className="text-gray-400 text-xs">-</span>
    )
    const diff = Math.abs(payment.ocr_amount - payment.amount_due)
    if (diff < 1) return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
        <TrendingUp className="w-3 h-3"/>ตรง
      </span>
    )
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
        <TrendingDown className="w-3 h-3"/>ไม่ตรง ({formatCurrency(payment.ocr_amount)})
      </span>
    )
  }

  const filterTabs = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'verifying', label: 'รอตรวจ' },
    { key: 'paid', label: 'ชำระแล้ว' },
    { key: 'rejected', label: 'ปฏิเสธ' },
  ]

  return (
    <AdminLayout title="ตรวจสอบการชำระเงิน">
      <ToastProvider/>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              filterStatus === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button onClick={fetchData} className="ml-auto p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4"/>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input
          type="text"
          placeholder="ค้นหาชื่อ, รหัส, อีเมล..."
          className="input-field pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner text="กำลังโหลด..."/>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-3">{filtered.length} รายการ</div>

          {/* Desktop table */}
          <div className="card hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">รหัส</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">ลูกค้า</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">ประเภทบัตร</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">ยอด</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">OCR</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">สถานะ</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.reg_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.reg_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{item.customer_name}</p>
                      <p className="text-xs text-gray-400">{item.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.ticket_type_name}
                      {item.seat_number && <p className="text-xs text-primary-600 font-bold">{item.seat_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OcrMatch payment={item.payment}/>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentStatusBadge status={item.payment_status}/>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setSelected(item); setDetailOpen(true) }}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4"/>
                        </button>
                        {item.payment_status === 'verifying' && (
                          <>
                            <button
                              onClick={() => { setSelected(item); setConfirmType('confirm') }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title="ยืนยัน"
                            >
                              <CheckCircle2 className="w-4 h-4"/>
                            </button>
                            <button
                              onClick={() => { setSelected(item); setConfirmType('reject') }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                              title="ปฏิเสธ"
                            >
                              <XCircle className="w-4 h-4"/>
                            </button>
                          </>
                        )}
                        {item.payment_status === 'paid' && (
                          <button
                            onClick={() => handleResend(item.reg_id)}
                            disabled={resending}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
                            title="ส่งอีเมลอีกครั้ง"
                          >
                            <Send className="w-4 h-4"/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">ไม่พบรายการ</div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map(item => (
              <div key={item.reg_id} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{item.customer_name}</p>
                    <p className="font-mono text-xs text-gray-400">{item.reg_id}</p>
                  </div>
                  <PaymentStatusBadge status={item.payment_status}/>
                </div>
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-gray-600">{item.ticket_type_name}</span>
                  <span className="font-bold text-gray-900">{formatCurrency(item.total_amount)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelected(item); setDetailOpen(true) }}
                    className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4"/>ดูรายละเอียด
                  </button>
                  {item.payment_status === 'verifying' && (
                    <>
                      <button
                        onClick={() => { setSelected(item); setConfirmType('confirm') }}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium"
                      >
                        ✓ ยืนยัน
                      </button>
                      <button
                        onClick={() => { setSelected(item); setConfirmType('reject') }}
                        className="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="รายละเอียดการชำระเงิน" size="lg">
        {selected && (
          <div className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">ชื่อลูกค้า</p>
                <p className="font-semibold text-gray-900">{selected.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">รหัส</p>
                <p className="font-mono font-bold text-primary-600 text-xs">{selected.reg_id}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">ประเภทบัตร</p>
                <p className="font-medium text-gray-900">{selected.ticket_type_name}</p>
              </div>
              {selected.seat_number && (
                <div>
                  <p className="text-gray-500 text-xs">เลขที่นั่ง</p>
                  <p className="font-bold text-primary-600 text-lg">{selected.seat_number}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs">ยอดที่ต้องชำระ</p>
                <p className="font-bold text-gray-900">{formatCurrency(selected.total_amount)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">สถานะ</p>
                <PaymentStatusBadge status={selected.payment_status}/>
              </div>
            </div>

            {/* OCR Report */}
            {selected.payment && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4"/>
                  รายงานช่วยตรวจ (OCR)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-blue-600">ยอดที่ต้องชำระ</p>
                    <p className="font-bold text-gray-900">{formatCurrency(selected.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">OCR อ่านได้</p>
                    <p className={`font-bold ${
                      selected.payment.ocr_amount && Math.abs(selected.payment.ocr_amount - selected.total_amount) < 1
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}>
                      {selected.payment.ocr_amount ? formatCurrency(selected.payment.ocr_amount) : 'อ่านไม่ได้'}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600">วันที่โอน</p>
                    <p className="font-medium">{selected.payment.ocr_transfer_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">เวลา</p>
                    <p className="font-medium">{selected.payment.ocr_transfer_time || '-'}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">ชื่อผู้โอน</p>
                    <p className="font-medium">{selected.payment.ocr_sender_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">ธนาคาร</p>
                    <p className="font-medium">{selected.payment.ocr_bank || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-blue-600 mb-1">สถานะ OCR</p>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${
                        selected.payment.ocr_status === 'success' ? 'badge-green' :
                        selected.payment.ocr_status === 'partial' ? 'badge-yellow' : 'badge-red'
                      }`}>
                        {getOcrStatusLabel(selected.payment.ocr_status)}
                      </span>
                      {selected.payment.ocr_confidence !== undefined && (
                        <span className="text-gray-500">ความมั่นใจ: {selected.payment.ocr_confidence}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slip image */}
            {selected.payment?.slip_url && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900 text-sm">สลิปการโอนเงิน</h4>
                  <a
                    href={selected.payment.slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3"/>เปิดใน Drive
                  </a>
                </div>
                <img
                  src={selected.payment.slip_url}
                  alt="slip"
                  className="w-full max-h-80 object-contain rounded-xl border border-gray-200"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}

            {/* Action buttons */}
            {selected.payment_status === 'verifying' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setDetailOpen(false); setConfirmType('reject') }}
                  className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4"/>ปฏิเสธ
                </button>
                <button
                  onClick={() => { setDetailOpen(false); setConfirmType('confirm') }}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4"/>ยืนยัน
                </button>
              </div>
            )}
            {selected.payment_status === 'paid' && (
              <div className="pt-2">
                <button
                  onClick={() => handleResend(selected.reg_id)}
                  disabled={resending}
                  className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4"/>
                  {resending ? 'กำลังส่ง...' : 'ส่งอีเมลบัตรอีกครั้ง'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm payment */}
      <ConfirmModal
        open={confirmType === 'confirm'}
        onClose={() => setConfirmType(null)}
        onConfirm={handleConfirm}
        title="ยืนยันการชำระเงิน"
        message={`ยืนยันการชำระเงินของ "${selected?.customer_name}" จำนวน ${formatCurrency(selected?.total_amount ?? 0)} ?\n\nระบบจะสร้างบัตรและส่งให้ทาง LINE และ Email`}
        confirmLabel="ยืนยันและส่งบัตร"
        type="success"
        loading={processing}
      />

      {/* Reject modal */}
      <Modal
        open={confirmType === 'reject'}
        onClose={() => setConfirmType(null)}
        title="ปฏิเสธการชำระเงิน"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">ระบุเหตุผลในการปฏิเสธ</p>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="เช่น ยอดเงินไม่ตรง, สลิปไม่ชัดเจน, ..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmType(null)}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason || processing}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50"
            >
              {processing ? 'กำลังดำเนินการ...' : 'ปฏิเสธ'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
