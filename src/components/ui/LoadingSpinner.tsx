'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export function LoadingSpinner({ size = 'md', text, fullScreen }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  }

  const spinner = (
    <div className={`border-primary-200 border-t-primary-600 rounded-full animate-spin ${sizeMap[size]}`}/>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 flex flex-col items-center justify-center z-50 gap-4">
        {spinner}
        {text && <p className="text-gray-600 font-medium text-sm">{text}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      {spinner}
      {text && <p className="text-gray-500 text-sm">{text}</p>}
    </div>
  )
}
