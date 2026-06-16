'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, CalendarDays,
  Ticket, Settings, QrCode, LogOut, Menu, X, ChevronRight,
  Bell, Shield,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5"/> },
  { href: '/admin/payments', label: 'ตรวจสอบการชำระเงิน', icon: <CreditCard className="w-5 h-5"/> },
  { href: '/admin/registrations', label: 'รายการลงทะเบียน', icon: <Users className="w-5 h-5"/> },
  { href: '/admin/checkin', label: 'Check-in', icon: <QrCode className="w-5 h-5"/> },
  { href: '/admin/events', label: 'จัดการงาน', icon: <CalendarDays className="w-5 h-5"/>, roles: ['super_admin', 'admin'] },
  { href: '/admin/tickets', label: 'ประเภทบัตร', icon: <Ticket className="w-5 h-5"/>, roles: ['super_admin', 'admin'] },
  { href: '/admin/staffs', label: 'จัดการเจ้าหน้าที่', icon: <Shield className="w-5 h-5"/>, roles: ['super_admin'] },
  { href: '/admin/settings', label: 'ตั้งค่าระบบ', icon: <Settings className="w-5 h-5"/>, roles: ['super_admin'] },
]

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<string>('')
  const [staffName, setStaffName] = useState('')

  useEffect(() => {
    const r = localStorage.getItem('admin_role') || ''
    const n = localStorage.getItem('admin_name') || ''
    if (r && n) {
      setRole(r)
      setStaffName(n)
    } else {
      // localStorage cleared but cookie still valid — fetch from server
      fetch('/api/admin/profile')
        .then(res => res.json())
        .then(d => {
          if (d.success && d.data) {
            setRole(d.data.role)
            setStaffName(d.data.staff_name)
            localStorage.setItem('admin_role', d.data.role)
            localStorage.setItem('admin_name', d.data.staff_name)
            localStorage.setItem('admin_id', d.data.staff_id)
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_id')
    router.push('/admin')
  }

  const filteredNav = navItems.filter(item =>
    !item.roles || item.roles.includes(role)
  )

  const roleLabel = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
  }[role] || role

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-navy-800
        transform transition-transform duration-300 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 100%)' }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Ticket sales</h1>
              <p className="text-primary-300 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Staff info */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{staffName.charAt(0) || 'A'}</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{staffName || 'Admin'}</p>
              <p className="text-primary-300 text-xs">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {filteredNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all
                  ${active
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4"/>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all"
          >
            <LogOut className="w-5 h-5"/>
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600"
          >
            <Menu className="w-5 h-5"/>
          </button>
          <h2 className="font-bold text-gray-900 text-lg flex-1">{title}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 rounded-xl px-3 py-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"/>
              <span className="hidden sm:block">{staffName}</span>
              <span className="text-xs text-primary-600 font-medium">({roleLabel})</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
