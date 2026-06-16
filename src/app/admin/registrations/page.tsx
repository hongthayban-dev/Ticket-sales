'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PaymentStatusBadge, CheckinStatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Search, Download, RefreshCw, Eye, FileDown } from 'lucide-react'
import type { Registration } from '@/types'

export default function RegistrationsPage() {
  const [items, setItems] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<Registration | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/registrations')
      const d = await res.json()
      if (d.success) setItems(d.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = items.filter(item => {
    const matchSearch = search === '' ||
      item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      item.reg_id.toLowerCase().includes(search.toLowerCase()) ||
      item.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      item.customer_phone?.includes(search) ||
      item.seat_number?.includes(search)

    const matchStatus = filterStatus === 'all' || item.payment_status === filterStatus

    return matchSearch && matchStatus
  })

  const exportCSV = () => {
    const headers = ['รหัส', 'ชื่อ', 'ชื่อเล่น', 'เบอร์', 'อีเมล', 'บัตร', 'ที่นั่ง', 'ยอด', 'สถานะ', 'วันที่']
    const rows = filtered.map(r => [
      r.reg_id, r.customer_name, r.customer_nickname, r.customer_phone,
      r.customer_email, r.ticket_type_name, r.seat_number || '',
      r.total_amount, r.payment_status, r.created_at,
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrations_${Date.now()}.csv`
    a.click()
  }

  const statusTabs = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'paid', label: 'ชำระแล้ว' },
    { key: 'verifying', label: 'รอตรวจ' },
    { key: 'pending_payment', label: 'รอชำระ' },
    { key: 'rejected', label: 'ปฏิเสธ' },
  ]

  return (
    <AdminLayout title="รายการลงทะเบียน">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input
            type="text"
            placeholder="ค้นหา..."
            className="input-field pl-9 py-2"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={fetchData} className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4"/>
        </button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold">
          <Download className="w-4 h-4"/>CSV
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              filterStatus === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">
              {tab.key === 'all' ? items.length : items.filter(i => i.payment_status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="กำลังโหลด..."/>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">{filtered.length} รายการ</p>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">รหัส</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">ลูกค้า</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs hidden sm:table-cell">ติดต่อ</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs hidden md:table-cell">บัตร</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">ยอด</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs">ชำระ</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs hidden lg:table-cell">Check-in</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(reg => (
                    <tr key={reg.reg_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-gray-500">{reg.reg_id}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(reg.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{reg.customer_name}</p>
                        {reg.customer_nickname && <p className="text-xs text-gray-400">({reg.customer_nickname})</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600 text-xs">
                        <p>{reg.customer_phone}</p>
                        <p className="text-gray-400 truncate max-w-32">{reg.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-gray-700">{reg.ticket_type_name}</p>
                        {reg.seat_number && (
                          <p className="font-bold text-primary-600 text-sm">{reg.seat_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(reg.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PaymentStatusBadge status={reg.payment_status}/>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <CheckinStatusBadge status={reg.checkin_status || 'pending'}/>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelected(reg)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">ไม่พบรายการ</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="รายละเอียดการลงทะเบียน" size="md">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'รหัส', value: selected.reg_id },
                { label: 'สถานะ', value: <PaymentStatusBadge status={selected.payment_status}/> },
                { label: 'ชื่อ-นามสกุล', value: selected.customer_name },
                { label: 'ชื่อเล่น', value: selected.customer_nickname || '-' },
                { label: 'เบอร์โทร', value: selected.customer_phone },
                { label: 'อีเมล', value: selected.customer_email },
                { label: 'ประเภทบัตร', value: selected.ticket_type_name },
                { label: 'เลขที่นั่ง', value: selected.seat_number || '-' },
                { label: 'ยอดชำระ', value: formatCurrency(selected.total_amount) },
                { label: 'Check-in', value: <CheckinStatusBadge status={selected.checkin_status || 'pending'}/> },
                { label: 'ลงทะเบียนเมื่อ', value: formatDateTime(selected.created_at) },
                { label: 'อัปเดตล่าสุด', value: formatDateTime(selected.updated_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                  <div className="font-medium text-gray-900">{value}</div>
                </div>
              ))}
            </div>

            {selected.payment_status === 'paid' && (
              <div className="flex gap-2 pt-2">
                {selected.ticket_png_url && (
                  <a href={selected.ticket_png_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4"/>ดูบัตร
                  </a>
                )}
                {selected.ticket_pdf_url && (
                  <a href={selected.ticket_pdf_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2">
                    <FileDown className="w-4 h-4"/>PDF
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
