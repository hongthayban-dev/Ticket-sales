'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiffProvider, useLiff } from '@/components/liff/LiffProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarDays, MapPin, Ticket, Users, ArrowLeft, CheckCircle } from 'lucide-react'
import type { Event, TicketType } from '@/types'

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2010308553-AKbYOyq3'

function EventContent() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useLiff()
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setEvent(d.data.event)
          setTicketTypes(d.data.ticketTypes)
        }
      })
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <LoadingSpinner fullScreen text="กำลังโหลดข้อมูลงาน..."/>
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-5xl mb-3">😞</div>
          <h2 className="font-bold text-gray-900">ไม่พบงานนี้</h2>
        </div>
      </div>
    )
  }

  const totalSold = ticketTypes.reduce((s, t) => s + t.ticket_sold, 0)
  const totalQuota = ticketTypes.reduce((s, t) => s + t.ticket_quota, 0)
  const soldPercent = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0

  return (
    <div className="liff-container min-h-screen pb-24">
      {/* Banner / Header */}
      <div className="relative">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.event_name} className="w-full h-52 object-cover"/>
        ) : (
          <div className="w-full h-52 gradient-header"/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-bold text-xl leading-tight">{event.event_name}</h1>
          <p className="text-white/80 text-sm mt-1">{formatDate(event.event_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Info card */}
        <div className="card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CalendarDays className="w-5 h-5 text-primary-500 mt-0.5"/>
            <div>
              <p className="text-xs text-gray-500">วันและเวลา</p>
              <p className="font-semibold text-gray-900 text-sm">
                {formatDate(event.event_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {event.event_end_date && (
                <p className="text-xs text-gray-500">ถึง {formatDate(event.event_end_date)}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary-500 mt-0.5"/>
            <div>
              <p className="text-xs text-gray-500">สถานที่</p>
              <p className="font-semibold text-gray-900 text-sm">{event.event_venue}</p>
            </div>
          </div>
          {totalQuota > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary-500 mt-0.5"/>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">ที่นั่งที่เหลือ</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {totalSold}/{totalQuota}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.event_description && (
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 mb-2">รายละเอียดงาน</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
              {event.event_description}
            </p>
          </div>
        )}

        {/* Ticket types (ticket_type mode) */}
        {event.ticket_mode === 'ticket_type' && ticketTypes.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 mb-3">ประเภทบัตร</h3>
            <div className="space-y-3">
              {ticketTypes.map(t => (
                <div key={t.ticket_id} className="card p-4 flex items-center gap-3">
                  <div
                    className="w-3 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.ticket_color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{t.ticket_name}</p>
                      {t.ticket_remaining === 0 && (
                        <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">หมด</span>
                      )}
                    </div>
                    {t.ticket_description && (
                      <p className="text-xs text-gray-500 mt-0.5">{t.ticket_description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">เหลือ {t.ticket_remaining} ที่</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatCurrency(t.ticket_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seat map info */}
        {event.ticket_mode === 'seat_map' && (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-600"/>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">เลือกที่นั่ง</p>
              <p className="text-xs text-gray-500">งานนี้ใช้ระบบเลือกที่นั่งจากผังที่นั่ง</p>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="card p-4 bg-primary-50 border border-primary-100">
          <h4 className="font-semibold text-primary-800 text-sm mb-2">สิ่งที่คุณจะได้รับ</h4>
          <div className="space-y-1.5">
            {['บัตรอิเล็กทรอนิกส์ผ่าน LINE', 'PDF ส่งทาง Email', 'QR Code สำหรับ Check-in'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0"/>
                <span className="text-sm text-primary-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => router.push(`/register/${event.event_id}`)}
            className="btn-primary w-full py-4 text-base"
          >
            ลงทะเบียนเข้าร่วมงาน
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventPage() {
  return (
    <LiffProvider liffId={LIFF_ID}>
      <EventContent/>
    </LiffProvider>
  )
}
