'use client'

import { useEffect, useState } from 'react'
import { LiffProvider, useLiff } from '@/components/liff/LiffProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin, Ticket, ChevronRight, UserCircle } from 'lucide-react'
import Link from 'next/link'
import type { Event } from '@/types'

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2010405513-QHMDmGF3'

function HomeContent() {
  const { profile } = useLiff()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => { if (d.success) setEvents(d.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="liff-container min-h-screen">
      {/* Header */}
      <div className="gradient-header text-white px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-200 text-sm">สวัสดี</p>
            <h1 className="text-xl font-bold">{profile?.displayName || 'คุณ'} 👋</h1>
          </div>
          {profile?.pictureUrl ? (
            <img src={profile.pictureUrl} alt="" className="w-11 h-11 rounded-full border-2 border-white/50 shadow"/>
          ) : (
            <UserCircle className="w-11 h-11 text-white/60"/>
          )}
        </div>
        <div className="bg-white/15 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-white"/>
            <span className="text-white font-bold text-lg">Ticket sales</span>
          </div>
          <p className="text-primary-100 text-sm mt-1">ระบบจำหน่ายบัตรงานประชุมและอีเว้นต์</p>
        </div>
      </div>

      {/* Events */}
      <div className="px-4 py-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">งานที่เปิดรับลงทะเบียน</h2>

        {loading && <LoadingSpinner text="กำลังโหลดข้อมูล..."/>}

        {!loading && events.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">ยังไม่มีงานที่เปิดรับลงทะเบียน</h3>
            <p className="text-gray-500 text-sm">กรุณาติดตามข่าวสารเพิ่มเติมผ่าน LINE OA</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {events.map(event => (
            <Link key={event.event_id} href={`/event/${event.event_id}`}>
              <div className="card-hover">
                {/* Banner */}
                {event.banner_url ? (
                  <img src={event.banner_url} alt={event.event_name} className="w-full h-40 object-cover"/>
                ) : (
                  <div className="w-full h-36 gradient-header flex items-center justify-center">
                    <span className="text-5xl">🎫</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight flex-1">
                      {event.event_name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"/>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarDays className="w-4 h-4 text-primary-500 flex-shrink-0"/>
                      <span>{formatDate(event.event_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0"/>
                      <span>{event.event_venue}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button className="w-full btn-primary text-sm py-2.5">
                      ลงทะเบียนเข้าร่วมงาน
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* My registrations link */}
        {profile && (
          <Link href={`/my-tickets?uid=${profile.userId}`}>
            <div className="mt-4 card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-600"/>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">บัตรของฉัน</p>
                <p className="text-gray-500 text-xs">ดูบัตรที่ลงทะเบียนไว้</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400"/>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <LiffProvider liffId={LIFF_ID}>
      <HomeContent/>
    </LiffProvider>
  )
}
