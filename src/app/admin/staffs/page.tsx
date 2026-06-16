'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/utils'
import { Plus, Shield, Eye, EyeOff, Copy, Check } from 'lucide-react'
import type { Staff } from '@/types'

export default function StaffsPage() {
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    staff_name: '', role: 'staff' as Staff['role'],
    email: '', phone: '', password: '', line_user_id: '',
  })

  const fetchStaffs = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/staffs')
    const d = await res.json()
    if (d.success) setStaffs(d.data)
    setLoading(false)
  }

  useEffect(() => { fetchStaffs() }, [])

  const handleSave = async () => {
    if (!form.staff_name || !form.role) {
      showToast('error', 'กรุณากรอกชื่อและบทบาท')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/staffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setNewToken(d.data.token || '')
      showToast('success', 'สร้างบัญชีสำเร็จ')
      fetchStaffs()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusToggle = async (staff: Staff) => {
    try {
      await fetch('/api/admin/staffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.staff_id,
          status: staff.status === 'active' ? 'inactive' : 'active',
        }),
      })
      fetchStaffs()
      showToast('success', 'อัปเดตสถานะสำเร็จ')
    } catch {
      showToast('error', 'เกิดข้อผิดพลาด')
    }
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roleLabel: Record<Staff['role'], string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
  }
  const roleColor: Record<Staff['role'], string> = {
    super_admin: 'bg-red-100 text-red-700',
    admin: 'bg-primary-100 text-primary-700',
    staff: 'bg-gray-100 text-gray-600',
  }

  return (
    <AdminLayout title="จัดการเจ้าหน้าที่">
      <ToastProvider/>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setForm({ staff_name: '', role: 'staff', email: '', phone: '', password: '', line_user_id: '' })
            setNewToken('')
            setModalOpen(true)
          }}
          className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm"
        >
          <Plus className="w-4 h-4"/>เพิ่มเจ้าหน้าที่
        </button>
      </div>

      {loading ? (
        <LoadingSpinner/>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ชื่อ</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">ติดต่อ</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">บทบาท</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">เข้าสู่ระบบล่าสุด</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffs.map(staff => (
                <tr key={staff.staff_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">
                        {staff.staff_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{staff.staff_name}</p>
                        <p className="text-xs text-gray-400">{staff.staff_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600 text-xs">
                    <p>{staff.email || '-'}</p>
                    <p className="text-gray-400">{staff.phone || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor[staff.role]}`}>
                      {roleLabel[staff.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleStatusToggle(staff)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        staff.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {staff.status === 'active' ? 'เปิดใช้' : 'ปิดใช้'}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                    {staff.last_login ? formatDateTime(staff.last_login) : 'ยังไม่เคยเข้า'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Shield className="w-4 h-4 text-gray-300 mx-auto"/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffs.length === 0 && (
            <div className="text-center py-10 text-gray-400">ยังไม่มีเจ้าหน้าที่</div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="เพิ่มเจ้าหน้าที่"
        size="md"
      >
        {newToken ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600"/>
            </div>
            <h3 className="font-bold text-gray-900">สร้างบัญชีสำเร็จ!</h3>
            <p className="text-sm text-gray-600">คัดลอก Token ด้านล่างให้เจ้าหน้าที่เก็บไว้ (ไม่สามารถดูได้อีกครั้ง)</p>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm break-all border border-gray-200">
              {newToken}
            </div>
            <button
              onClick={() => copyToken(newToken)}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก Token'}
            </button>
            <button onClick={() => { setModalOpen(false); setNewToken('') }} className="w-full text-gray-500 text-sm">
              ปิด
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input type="text" className="input-field" placeholder="ชื่อเจ้าหน้าที่"
                value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))}/>
            </div>
            <div>
              <label className="label">บทบาท</label>
              <select className="input-field"
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Staff['role'] }))}>
                <option value="staff">Staff (Check-in เท่านั้น)</option>
                <option value="admin">Admin (ตรวจสลิป + รายงาน)</option>
                <option value="super_admin">Super Admin (ทุกสิทธิ์)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">อีเมล</label>
                <input type="email" className="input-field" placeholder="email@example.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
              </div>
              <div>
                <label className="label">เบอร์โทร</label>
                <input type="tel" className="input-field" placeholder="0812345678"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
              </div>
            </div>
            <div>
              <label className="label">LINE User ID</label>
              <input type="text" className="input-field" placeholder="U..."
                value={form.line_user_id} onChange={e => setForm(f => ({ ...f, line_user_id: e.target.value }))}/>
            </div>
            <div>
              <label className="label">รหัสผ่าน (ไม่บังคับ)</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input-field pr-10"
                  placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}/>
                <button onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary py-3">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-3">
                {saving ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
