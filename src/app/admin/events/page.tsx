'use client'

import { useEffect, useRef, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { Plus, CalendarDays, MapPin, Edit2, Ticket, Upload, X, ImageIcon, QrCode } from 'lucide-react'
import Link from 'next/link'
import type { Event } from '@/types'

const defaultForm: Partial<Event> = {
  ticket_mode: 'ticket_type',
  status: 'draft',
  max_capacity: 100,
  reservation_timeout: 15,
}

interface ImageUploadProps {
  label: string
  value?: string
  onChange: (url: string) => void
  uploadType: string
  aspect?: '1:1' | '16:9' | 'free'
  hint?: string
}

function ImageUpload({ label, value, onChange, uploadType, aspect = 'free', hint }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>(value || '')

  useEffect(() => { setPreview(value || '') }, [value])

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', uploadType)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPreview(data.data.url)
      onChange(data.data.url)
      showToast('success', 'อัปโหลดรูปสำเร็จ')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const previewClass = aspect === '1:1'
    ? 'w-full aspect-square max-w-[200px] mx-auto'
    : 'w-full aspect-video'

  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}

      {preview ? (
        <div className="relative inline-block w-full">
          <div className={previewClass + ' relative rounded-xl overflow-hidden border-2 border-primary-200'}>
            <img src={preview} alt="preview" className="w-full h-full object-contain bg-gray-50"/>
            <button
              type="button"
              onClick={() => { setPreview(''); onChange('') }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600"
            >
              <X className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className={`${previewClass} border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors`}
        >
          {uploading ? (
            <LoadingSpinner size="sm"/>
          ) : (
            <>
              <Upload className="w-7 h-7 text-gray-400"/>
              <span className="text-sm text-gray-500 font-medium">คลิกหรือลากรูปมาวาง</span>
              <span className="text-xs text-gray-400">PNG, JPG, WEBP ไม่เกิน 5MB</span>
              {aspect === '1:1' && <span className="text-xs text-primary-500 font-medium">สัดส่วน 1:1</span>}
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState<Partial<Event>>(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchEvents = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/events')
    const d = await res.json()
    if (d.success) setEvents(d.data)
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [])

  const handleSave = async () => {
    if (!form.event_name || !form.event_date || !form.event_venue) {
      showToast('error', 'กรุณากรอกข้อมูลที่จำเป็น')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await fetch('/api/admin/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: editing.event_id, ...form }),
        })
        showToast('success', 'อัปเดตงานสำเร็จ')
      } else {
        await fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        showToast('success', 'สร้างงานสำเร็จ')
      }
      setModalOpen(false)
      setForm(defaultForm)
      setEditing(null)
      fetchEvents()
    } catch {
      showToast('error', 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const statusLabel: Record<string, string> = {
    draft: 'ร่าง', active: 'เปิดรับ', closed: 'ปิดรับ', cancelled: 'ยกเลิก'
  }
  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-red-100 text-red-600',
    cancelled: 'bg-gray-200 text-gray-500',
  }

  return (
    <AdminLayout title="จัดการงาน">
      <ToastProvider/>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setForm(defaultForm); setEditing(null); setModalOpen(true) }}
          className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm"
        >
          <Plus className="w-4 h-4"/>สร้างงานใหม่
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="กำลังโหลด..."/>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(event => (
            <div key={event.event_id} className="card overflow-hidden hover:shadow-lg transition-shadow">
              {event.banner_url ? (
                <img src={event.banner_url} alt="" className="w-full h-36 object-cover"/>
              ) : (
                <div className="w-full h-36 gradient-header flex items-center justify-center">
                  <span className="text-4xl">🎫</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-gray-900 flex-1">{event.event_name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[event.status]}`}>
                    {statusLabel[event.status]}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary-400"/>
                    {formatDate(event.event_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-400"/>
                    {event.event_venue}
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-primary-400"/>
                    {event.ticket_mode === 'ticket_type' ? 'เลือกประเภทบัตร' : 'เลือกที่นั่ง'}
                  </div>
                </div>

                <div className="flex gap-2">
                  {event.ticket_mode === 'seat_map' ? (
                    <Link href={`/admin/events/${event.event_id}/seat-map`}
                      className="flex-1 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-semibold text-center flex items-center justify-center gap-1">
                      <QrCode className="w-3.5 h-3.5"/>ผังที่นั่ง
                    </Link>
                  ) : (
                    <Link href={`/admin/tickets?event_id=${event.event_id}`}
                      className="flex-1 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-semibold text-center">
                      จัดการบัตร
                    </Link>
                  )}
                  <button
                    onClick={() => { setForm(event); setEditing(event); setModalOpen(true) }}
                    className="py-2 px-3 rounded-xl bg-gray-100 text-gray-600"
                  >
                    <Edit2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              ยังไม่มีงาน กดสร้างงานใหม่เพื่อเริ่มต้น
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setForm(defaultForm) }}
        title={editing ? 'แก้ไขงาน' : 'สร้างงานใหม่'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">ชื่องาน <span className="text-red-500">*</span></label>
              <input type="text" className="input-field" placeholder="ชื่องานประชุม / อีเว้นต์"
                value={form.event_name || ''} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))}/>
            </div>

            <div>
              <label className="label">วันที่เริ่มงาน <span className="text-red-500">*</span></label>
              <input type="date" className="input-field"
                value={form.event_date || ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}/>
            </div>

            <div>
              <label className="label">วันที่สิ้นสุด</label>
              <input type="date" className="input-field"
                value={form.event_end_date || ''} onChange={e => setForm(f => ({ ...f, event_end_date: e.target.value }))}/>
            </div>

            <div className="sm:col-span-2">
              <label className="label">สถานที่ <span className="text-red-500">*</span></label>
              <input type="text" className="input-field" placeholder="ชื่อสถานที่"
                value={form.event_venue || ''} onChange={e => setForm(f => ({ ...f, event_venue: e.target.value }))}/>
            </div>

            <div className="sm:col-span-2">
              <label className="label">รายละเอียดงาน</label>
              <textarea className="input-field resize-none" rows={3} placeholder="คำอธิบายงาน..."
                value={form.event_description || ''} onChange={e => setForm(f => ({ ...f, event_description: e.target.value }))}/>
            </div>

            <div>
              <label className="label">โหมดบัตร</label>
              <select className="input-field"
                value={form.ticket_mode || 'ticket_type'}
                onChange={e => setForm(f => ({ ...f, ticket_mode: e.target.value as Event['ticket_mode'] }))}>
                <option value="ticket_type">เลือกประเภทบัตร</option>
                <option value="seat_map">เลือกที่นั่ง (Seat Map)</option>
              </select>
            </div>

            <div>
              <label className="label">สถานะ</label>
              <select className="input-field"
                value={form.status || 'draft'}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Event['status'] }))}>
                <option value="draft">ร่าง (ไม่แสดงสาธารณะ)</option>
                <option value="active">เปิดรับลงทะเบียน</option>
                <option value="closed">ปิดรับลงทะเบียน</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>

            <div>
              <label className="label">ระยะเวลาจองที่นั่ง (นาที)</label>
              <input type="number" className="input-field" min={5} max={60}
                value={form.reservation_timeout || 15}
                onChange={e => setForm(f => ({ ...f, reservation_timeout: Number(e.target.value) }))}/>
            </div>

            <div className="sm:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* Banner upload */}
                <ImageUpload
                  label="รูปแบนเนอร์งาน"
                  uploadType="banner"
                  aspect="16:9"
                  value={form.banner_url}
                  onChange={url => setForm(f => ({ ...f, banner_url: url }))}
                  hint="แนะนำขนาด 1200×630 px"
                />

                {/* PromptPay QR upload */}
                <div className="flex flex-col items-center">
                  <ImageUpload
                    label="QR Code PromptPay"
                    uploadType="promptpay_qr"
                    aspect="1:1"
                    value={form.promptpay_qr_url}
                    onChange={url => setForm(f => ({ ...f, promptpay_qr_url: url }))}
                    hint="อัปโหลด QR Code จาก Banking App สัดส่วน 1:1"
                  />
                  {form.promptpay_qr_url && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                      <QrCode className="w-3.5 h-3.5"/>
                      <span>QR Code พร้อมใช้งาน</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary py-3">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-3">
              {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'สร้างงาน'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
