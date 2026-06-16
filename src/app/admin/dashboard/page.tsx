'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Users, CreditCard, TrendingUp, QrCode,
  ArrowUpRight, AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react'
import type { DashboardStats, Registration } from '@/types'

interface DashboardData {
  stats: DashboardStats
  recent: Registration[]
  revenueByType: { name: string; count: number; revenue: number }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const stats = data?.stats

  const statCards = stats ? [
    {
      label: 'ลงทะเบียนทั้งหมด',
      value: stats.total_registrations,
      icon: <Users className="w-6 h-6"/>,
      color: 'bg-blue-500',
      sub: `ชำระแล้ว ${stats.paid_registrations} รายการ`,
    },
    {
      label: 'รอตรวจสอบ',
      value: stats.pending_registrations,
      icon: <AlertCircle className="w-6 h-6"/>,
      color: 'bg-amber-500',
      sub: 'รายการรอการยืนยัน',
      urgent: stats.pending_registrations > 0,
    },
    {
      label: 'รายได้รวม',
      value: formatCurrency(stats.total_revenue),
      icon: <TrendingUp className="w-6 h-6"/>,
      color: 'bg-emerald-500',
      sub: `จาก ${stats.paid_registrations} รายการ`,
    },
    {
      label: 'Check-in แล้ว',
      value: stats.checked_in,
      icon: <QrCode className="w-6 h-6"/>,
      color: 'bg-purple-500',
      sub: `จาก ${stats.paid_registrations} ที่ชำระแล้ว`,
    },
  ] : []

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <LoadingSpinner text="กำลังโหลดข้อมูล..."/>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => (
              <div key={i} className={`card p-5 ${card.urgent ? 'border-l-4 border-l-amber-400' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center text-white`}>
                    {card.icon}
                  </div>
                  {card.urgent && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium animate-pulse-soft">
                      ด่วน
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs font-medium mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-gray-400 text-xs mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by ticket type */}
            {data?.revenueByType && data.revenueByType.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 mb-4">รายได้ตามประเภทบัตร</h3>
                <div className="space-y-3">
                  {data.revenueByType.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(item.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary-500"
                            style={{
                              width: `${Math.round((item.revenue / (stats?.total_revenue || 1)) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{item.count} ใบ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status summary */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">สรุปสถานะ</h3>
              <div className="space-y-3">
                {[
                  { label: 'ชำระแล้ว', value: stats?.paid_registrations || 0, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500"/>, color: 'bg-emerald-100' },
                  { label: 'รอตรวจสอบ', value: stats?.pending_registrations || 0, icon: <AlertCircle className="w-5 h-5 text-amber-500"/>, color: 'bg-amber-100' },
                  { label: 'ถูกปฏิเสธ', value: stats?.rejected_registrations || 0, icon: <XCircle className="w-5 h-5 text-red-500"/>, color: 'bg-red-100' },
                  { label: 'Check-in แล้ว', value: stats?.checked_in || 0, icon: <QrCode className="w-5 h-5 text-purple-500"/>, color: 'bg-purple-100' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center`}>
                      {item.icon}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="font-bold text-gray-900 text-lg">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent registrations */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">รายการล่าสุด</h3>
              <a href="/admin/registrations" className="text-primary-600 text-sm font-medium flex items-center gap-1">
                ดูทั้งหมด <ArrowUpRight className="w-4 h-4"/>
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">รหัส</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">ชื่อ</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs hidden sm:table-cell">ประเภทบัตร</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs hidden md:table-cell">ยอดเงิน</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.recent || []).map(reg => (
                    <tr key={reg.reg_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{reg.reg_id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{reg.customer_name}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(reg.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{reg.ticket_type_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 hidden md:table-cell">
                        {formatCurrency(reg.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PaymentStatusBadge status={reg.payment_status}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data?.recent || data.recent.length === 0) && (
                <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีรายการ</div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
