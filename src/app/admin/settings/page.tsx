'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { Save, Info } from 'lucide-react'

interface SettingsForm {
  promptpay_number: string
  event_name: string
  email_sender: string
  admin_line_user_id: string
  app_name: string
  ticket_footer_text: string
  reservation_timeout: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SettingsForm>({
    promptpay_number: '',
    event_name: '',
    email_sender: '',
    admin_line_user_id: '',
    app_name: 'Ticket sales',
    ticket_footer_text: 'ใช้แสดงหน้างานเพื่อเข้างาน | บัตรนี้ใช้ได้ครั้งเดียวเท่านั้น',
    reservation_timeout: '15',
  })

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setForm(prev => ({ ...prev, ...d.data }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      showToast('success', 'บันทึกการตั้งค่าสำเร็จ')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    {
      title: 'ข้อมูลระบบ',
      fields: [
        { key: 'app_name', label: 'ชื่อระบบ', placeholder: 'Ticket sales', type: 'text' },
        { key: 'event_name', label: 'ชื่องานหลัก', placeholder: 'ชื่อการประชุม / อีเว้นต์', type: 'text' },
      ],
    },
    {
      title: 'PromptPay',
      fields: [
        { key: 'promptpay_number', label: 'หมายเลข PromptPay', placeholder: '0812345678 / 1234567890123', type: 'text',
          note: 'เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน/นิติบุคคล 13 หลัก' },
      ],
    },
    {
      title: 'LINE',
      fields: [
        { key: 'admin_line_user_id', label: 'Admin LINE User ID', placeholder: 'Uxxxxxxxx', type: 'text',
          note: 'ID สำหรับรับการแจ้งเตือนเมื่อมีการอัปโหลดสลิป' },
      ],
    },
    {
      title: 'อีเมล',
      fields: [
        { key: 'email_sender', label: 'อีเมลผู้ส่ง', placeholder: 'noreply@example.com', type: 'email' },
      ],
    },
    {
      title: 'บัตร / E-Ticket',
      fields: [
        { key: 'ticket_footer_text', label: 'ข้อความบนบัตร', placeholder: 'ข้อความแสดงหน้างาน...', type: 'text' },
        { key: 'reservation_timeout', label: 'ระยะเวลาจองที่นั่ง (นาที)', placeholder: '15', type: 'number',
          note: 'ที่นั่งจะถูกคืนหากไม่ชำระภายในเวลาที่กำหนด' },
      ],
    },
  ]

  return (
    <AdminLayout title="ตั้งค่าระบบ">
      <ToastProvider/>

      {loading ? (
        <LoadingSpinner/>
      ) : (
        <div className="max-w-2xl space-y-6">
          {sections.map(section => (
            <div key={section.title} className="card p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-5 pb-3 border-b border-gray-100">
                {section.title}
              </h3>
              <div className="space-y-4">
                {section.fields.map(field => (
                  <div key={field.key}>
                    <label className="label">{field.label}</label>
                    <input
                      type={field.type}
                      className="input-field"
                      placeholder={field.placeholder}
                      value={form[field.key as keyof SettingsForm] || ''}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    />
                    {field.note && (
                      <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-1.5">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
                        {field.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Env vars notice */}
          <div className="card p-5 bg-amber-50 border border-amber-200">
            <h4 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
              <Info className="w-4 h-4"/>ข้อมูล Secret
            </h4>
            <p className="text-amber-700 text-xs leading-relaxed">
              ข้อมูล Secret เช่น Google Service Account, LINE Channel Secret, Email Password
              ต้องตั้งค่าในไฟล์ <code className="bg-amber-100 px-1 rounded">.env.local</code> หรือ Environment Variables ของ Vercel/Server
              ไม่ควรเก็บใน Google Sheets
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 py-3 px-8"
          >
            <Save className="w-4 h-4"/>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
