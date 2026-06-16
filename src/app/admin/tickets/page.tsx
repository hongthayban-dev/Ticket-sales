'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils'
import { Plus, Edit2, Users } from 'lucide-react'
import type { TicketType } from '@/types'

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d']

export default function TicketsPage() {
  const searchParams = useSearchParams()
  const event_id = searchParams.get('event_id') || ''
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TicketType | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ticket_name: '', ticket_type: '', ticket_price: 0,
    ticket_quota: 0, ticket_color: '#2563eb', ticket_description: '', sort_order: 0,
  })

  const fetch_tickets = async () => {
    if (!event_id) return
    setLoading(true)
    const res = await fetch(`/api/admin/tickets?event_id=${event_id}`)
    const d = await res.json()
    if (d.success) setTickets(d.data)
    setLoading(false)
  }

  useEffect(() => { fetch_tickets() }, [event_id])

  const handleSave = async () => {
    if (!form.ticket_name || !event_id) {
      showToast('error', 'กรุณากรอกชื่อบัตร')
      return
    }
    setSaving(true)
    try {
      let res: Response
      if (editing) {
        res = await fetch('/api/admin/tickets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: editing.ticket_id, ...form }),
        })
      } else {
        res = await fetch('/api/admin/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id, ...form }),
        })
      }
      const d = await res.json()
      if (!d.success) {
        showToast('error', d.error || 'บันทึกไม่สำเร็จ')
        return
      }
      showToast('success', editing ? 'อัปเดตสำเร็จ' : 'เพิ่มประเภทบัตรสำเร็จ')
      setModalOpen(false)
      setEditing(null)
      fetch_tickets()
    } catch {
      showToast('error', 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const totalSold = tickets.reduce((s, t) => s + t.ticket_sold, 0)
  const totalQuota = tickets.reduce((s, t) => s + t.ticket_quota, 0)
  const totalRevenue = tickets.reduce((s, t) => s + (t.ticket_sold * t.ticket_price), 0)

  return (
    <AdminLayout title="จัดการประเภทบัตร">
      <ToastProvider/>

      {!event_id ? (
        <div className="text-center py-16 text-gray-400">
          กรุณาเลือกงานจากหน้า <a href="/admin/events" className="text-primary-600">จัดการงาน</a> ก่อน
        </div>
      ) : (
        <>
          {/* Summary */}
          {!loading && tickets.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4 text-center">
                <p className="text-gray-500 text-xs">ขายแล้ว / ทั้งหมด</p>
                <p className="font-bold text-2xl text-gray-900">{totalSold}<span className="text-gray-400 text-lg">/{totalQuota}</span></p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-gray-500 text-xs">คงเหลือ</p>
                <p className="font-bold text-2xl text-emerald-600">{totalQuota - totalSold}</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-gray-500 text-xs">รายได้รวม</p>
                <p className="font-bold text-lg text-primary-600">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">ประเภทบัตรทั้งหมด</h3>
            <button
              onClick={() => {
                setForm({ ticket_name: '', ticket_type: '', ticket_price: 0, ticket_quota: 0, ticket_color: '#2563eb', ticket_description: '', sort_order: tickets.length })
                setEditing(null)
                setModalOpen(true)
              }}
              className="flex items-center gap-2 btn-primary py-2 px-4 text-sm"
            >
              <Plus className="w-4 h-4"/>เพิ่มประเภทบัตร
            </button>
          </div>

          {loading ? (
            <LoadingSpinner/>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.ticket_id} className="card p-4 flex items-center gap-4">
                  <div className="w-4 h-16 rounded-full flex-shrink-0" style={{ backgroundColor: t.ticket_color }}/>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{t.ticket_name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.status === 'active' ? 'เปิด' : 'ปิด'}
                      </span>
                    </div>
                    {t.ticket_description && <p className="text-xs text-gray-500 mb-2">{t.ticket_description}</p>}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-3.5 h-3.5"/>
                        <span>{t.ticket_sold}/{t.ticket_quota}</span>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${(t.ticket_sold / t.ticket_quota) * 100}%`, backgroundColor: t.ticket_color }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">เหลือ {t.ticket_remaining}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary-600 text-lg">{formatCurrency(t.ticket_price)}</p>
                    <button
                      onClick={() => {
                        setForm({
                          ticket_name: t.ticket_name, ticket_type: t.ticket_type,
                          ticket_price: t.ticket_price, ticket_quota: t.ticket_quota,
                          ticket_color: t.ticket_color, ticket_description: t.ticket_description || '',
                          sort_order: t.sort_order,
                        })
                        setEditing(t)
                        setModalOpen(true)
                      }}
                      className="text-xs text-gray-500 flex items-center gap-1 mt-1 ml-auto"
                    >
                      <Edit2 className="w-3 h-3"/>แก้ไข
                    </button>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="card p-12 text-center text-gray-400">
                  ยังไม่มีประเภทบัตร กดเพิ่มเพื่อเริ่มต้น
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'แก้ไขประเภทบัตร' : 'เพิ่มประเภทบัตร'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">ชื่อประเภทบัตร <span className="text-red-500">*</span></label>
            <input type="text" className="input-field" placeholder="เช่น Regular, VIP, VVIP"
              value={form.ticket_name} onChange={e => setForm(f => ({ ...f, ticket_name: e.target.value, ticket_type: e.target.value }))}/>
          </div>
          <div>
            <label className="label">คำอธิบาย</label>
            <input type="text" className="input-field" placeholder="สิทธิ์ที่ได้รับ..."
              value={form.ticket_description} onChange={e => setForm(f => ({ ...f, ticket_description: e.target.value }))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ราคา (บาท)</label>
              <input type="number" className="input-field" min={0}
                value={form.ticket_price} onChange={e => setForm(f => ({ ...f, ticket_price: Number(e.target.value) }))}/>
            </div>
            <div>
              <label className="label">จำนวนที่นั่ง</label>
              <input type="number" className="input-field" min={1}
                value={form.ticket_quota} onChange={e => setForm(f => ({ ...f, ticket_quota: Number(e.target.value) }))}/>
            </div>
          </div>
          <div>
            <label className="label">สีบัตร</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, ticket_color: color }))}
                  className={`w-8 h-8 rounded-lg transition-transform ${form.ticket_color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input type="color" className="w-8 h-8 rounded-lg cursor-pointer border-0"
                value={form.ticket_color} onChange={e => setForm(f => ({ ...f, ticket_color: e.target.value }))}/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary py-3">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-3">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
