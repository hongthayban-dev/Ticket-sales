'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500"/>,
  error: <XCircle className="w-5 h-5 text-red-500"/>,
  warning: <AlertCircle className="w-5 h-5 text-yellow-500"/>,
  info: <AlertCircle className="w-5 h-5 text-blue-500"/>,
}

const colorMap = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
}

let toastFn: ((type: ToastType, message: string) => void) | null = null

export function showToast(type: ToastType, message: string) {
  toastFn?.(type, message)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // Register global function
  toastFn = addToast

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`bg-white rounded-xl shadow-lg border border-gray-100 border-l-4 ${colorMap[toast.type]} p-4 flex items-start gap-3 animate-slide-up`}
        >
          {iconMap[toast.type]}
          <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
          <button onClick={() => remove(toast.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4"/>
          </button>
        </div>
      ))}
    </div>
  )
}
