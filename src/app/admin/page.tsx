'use client'

import { useState, useEffect } from 'react'
import { Ticket, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const [tab, setTab] = useState<'password' | 'token'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Clear stale auth state when landing on login page
  useEffect(() => {
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_id')
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const body = tab === 'password'
        ? { email, password }
        : { token }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      localStorage.setItem('admin_role', data.data.role)
      localStorage.setItem('admin_name', data.data.staff_name)
      localStorage.setItem('admin_id', data.data.staff_id)
      window.location.href = '/admin/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="gradient-header p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Ticket className="w-9 h-9 text-primary-600"/>
          </div>
          <h1 className="text-white font-bold text-2xl">Ticket sales</h1>
          <p className="text-primary-200 text-sm mt-1">Admin Panel</p>
        </div>

        <div className="p-6">
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['password', 'token'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t ? 'bg-white shadow text-primary-700' : 'text-gray-500'
                }`}
              >
                {t === 'password' ? 'Email / Password' : 'Admin Token'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0"/>
              {error}
            </div>
          )}

          {tab === 'password' ? (
            <div className="space-y-4">
              <div>
                <label className="label">อีเมล</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div>
                <label className="label">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Admin Token</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-10 pr-12"
                  placeholder="your-admin-token"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">ใช้ Super Admin Token จากระบบ</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary w-full mt-6 py-3.5"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Ticket sales Admin Panel v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
