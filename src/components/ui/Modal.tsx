'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className={`relative bg-white w-full ${sizeMap[size]} rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4"/>
            </button>
          </div>
        )}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  type?: 'danger' | 'success' | 'info'
  loading?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก',
  type = 'info', loading,
}: ConfirmModalProps) {
  const btnColor = {
    danger: 'bg-red-500 hover:bg-red-600',
    success: 'bg-emerald-500 hover:bg-emerald-600',
    info: 'bg-primary-600 hover:bg-primary-700',
  }[type]

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold transition-colors ${btnColor} disabled:opacity-50`}
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
