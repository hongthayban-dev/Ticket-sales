'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

interface LiffContextValue {
  liff: typeof import('@line/liff').default | null
  profile: LiffProfile | null
  isLoggedIn: boolean
  isInClient: boolean
  isReady: boolean
  error: string | null
}

const LiffContext = createContext<LiffContextValue>({
  liff: null, profile: null, isLoggedIn: false,
  isInClient: false, isReady: false, error: null,
})

export function useLiff() {
  return useContext(LiffContext)
}

export function LiffProvider({
  children,
  liffId,
}: {
  children: React.ReactNode
  liffId: string
}) {
  const [state, setState] = useState<LiffContextValue>({
    liff: null, profile: null, isLoggedIn: false,
    isInClient: false, isReady: false, error: null,
  })

  useEffect(() => {
    const init = async () => {
      // Dev bypass: use mock profile on localhost
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        setState({
          liff: null,
          profile: { userId: 'dev_user_001', displayName: 'Dev User', pictureUrl: undefined },
          isLoggedIn: true,
          isInClient: false,
          isReady: true,
          error: null,
        })
        return
      }

      try {
        const liff = (await import('@line/liff')).default
        await liff.init({ liffId })

        const isLoggedIn = liff.isLoggedIn()
        const isInClient = liff.isInClient()

        if (!isLoggedIn) {
          liff.login()
          return
        }

        const profile = await liff.getProfile()

        setState({
          liff,
          profile: {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            statusMessage: profile.statusMessage,
          },
          isLoggedIn,
          isInClient,
          isReady: true,
          error: null,
        })
      } catch (err) {
        console.error('LIFF init error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setState(prev => ({
          ...prev,
          isReady: true,
          error: `LIFF Error: ${msg} (ID: ${liffId})`,
        }))
      }
    }

    init()
  }, [liffId])

  if (!state.isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
          <span className="text-3xl">🎫</span>
        </div>
        <h1 className="text-white font-bold text-xl mb-2">Ticket sales</h1>
        <div className="border-white/30 border-t-white w-8 h-8 border-4 rounded-full animate-spin mt-4"/>
        <p className="text-white/70 text-sm mt-3">กำลังเชื่อมต่อ LINE...</p>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-gray-600 text-center text-sm">{state.error}</p>
        <p className="text-gray-400 text-xs mt-2">กรุณาเปิดผ่าน LINE เท่านั้น</p>
      </div>
    )
  }

  return (
    <LiffContext.Provider value={state}>
      {children}
    </LiffContext.Provider>
  )
}
