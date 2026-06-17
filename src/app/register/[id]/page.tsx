'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiffProvider, useLiff } from '@/components/liff/LiffProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StepIndicator } from '@/components/liff/StepIndicator'
import { formatCurrency, formatDate, getSeatStatusColor } from '@/lib/utils'
import { ArrowLeft, Check, AlertCircle } from 'lucide-react'
import type { Event, TicketType, Seat } from '@/types'

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2010405513-QHMDmGF3'
const STEPS = [
  { label: 'เลือกบัตร' },
  { label: 'กรอกข้อมูล' },
  { label: 'ยืนยัน' },
]

function RegisterContent() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useLiff()

  const [step, setStep] = useState(0)
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [form, setForm] = useState({
    customer_name: '', customer_nickname: '',
    customer_phone: '', customer_email: '',
  })

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setEvent(d.data.event)
          setTicketTypes(d.data.ticketTypes || [])
          setSeats(d.data.seats || [])
        }
      })
      .finally(() => setLoading(false))
  }, [params.id])

  const handleNext = () => {
    if (step === 0) {
      if (event?.ticket_mode === 'ticket_type' && !selectedTicket) {
        setError('กรุณาเลือกประเภทบัตร')
        return
      }
      if (event?.ticket_mode === 'seat_map' && !selectedSeat) {
        setError('กรุณาเลือกที่นั่ง')
        return
      }
    }
    if (step === 1) {
      if (!form.customer_name || !form.customer_phone || !form.customer_email) {
        setError('กรุณากรอกข้อมูลให้ครบ')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.customer_email)) {
        setError('รูปแบบอีเมลไม่ถูกต้อง')
        return
      }
      const phoneRegex = /^[0-9]{9,10}$/
      if (!phoneRegex.test(form.customer_phone.replace(/[-\s]/g, ''))) {
        setError('รูปแบบเบอร์โทรไม่ถูกต้อง')
        return
      }
    }
    setError('')
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    if (!profile || !event) return
    setSubmitting(true)
    setError('')
    try {
      const body = {
        event_id: event.event_id,
        line_user_id: profile.userId,
        line_display_name: profile.displayName,
        ...form,
        ticket_type_id: selectedTicket?.ticket_id,
        seat_id: selectedSeat?.seat_id,
        quantity: 1,
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'เกิดข้อผิดพลาด')
      router.push(`/payment/${data.data.reg_id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner fullScreen text="กำลังโหลด..."/>
  if (!event) return null

  // Seat map grouped by zone
  const seatsByZone = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    if (!acc[seat.seat_zone]) acc[seat.seat_zone] = []
    acc[seat.seat_zone].push(seat)
    return acc
  }, {})

  return (
    <div className="liff-container min-h-screen pb-24">
      {/* Header */}
      <div className="gradient-header text-white px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <h1 className="font-bold text-lg">ลงทะเบียน</h1>
            <p className="text-primary-200 text-xs">{event.event_name}</p>
          </div>
        </div>
        <StepIndicator steps={STEPS} currentStep={step}/>
      </div>

      <div className="px-4 py-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/>
            {error}
          </div>
        )}

        {/* Step 0: Select ticket / seat */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">
              {event.ticket_mode === 'ticket_type' ? 'เลือกประเภทบัตร' : 'เลือกที่นั่ง'}
            </h2>

            {/* Ticket type selection */}
            {event.ticket_mode === 'ticket_type' && (
              <div className="space-y-3">
                {ticketTypes.filter(t => t.status === 'active').map(t => {
                  const selected = selectedTicket?.ticket_id === t.ticket_id
                  const soldOut = t.ticket_remaining === 0
                  return (
                    <button
                      key={t.ticket_id}
                      onClick={() => !soldOut && setSelectedTicket(t)}
                      disabled={soldOut}
                      className={`w-full card p-4 flex items-center gap-3 text-left transition-all ${
                        selected ? 'border-2 border-primary-500 bg-primary-50' : ''
                      } ${soldOut ? 'opacity-50' : 'hover:border-primary-300'}`}
                    >
                      <div
                        className="w-3 h-14 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.ticket_color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{t.ticket_name}</p>
                          {soldOut && <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">หมดแล้ว</span>}
                        </div>
                        {t.ticket_description && <p className="text-xs text-gray-500 mt-0.5">{t.ticket_description}</p>}
                        <p className="text-xs text-gray-400 mt-1">เหลือ {t.ticket_remaining}/{t.ticket_quota} ที่นั่ง</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600 text-lg">{formatCurrency(t.ticket_price)}</p>
                        {selected && <Check className="w-5 h-5 text-primary-600 ml-auto mt-1"/>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Seat map */}
            {event.ticket_mode === 'seat_map' && (
              <div>
                {(() => {
                  const ZONE_PALETTE = ['#ef4444','#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#6366f1','#f59e0b']

                  // col: prefer seat_col, fallback parse from seat_number "A3" → 3
                  const getCol = (s: Seat) =>
                    s.seat_col > 0
                      ? s.seat_col
                      : (parseInt(s.seat_number.replace(/^[A-Za-z]+/, '')) || 0)

                  // row: prefer seat_row, fallback from seat_number "A3" → "A"
                  const getRow = (s: Seat) =>
                    (s.seat_row && s.seat_row.trim()) ||
                    s.seat_number.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() || '?'

                  // Real seats only (no aisles, no 'aisle' zone)
                  const realSeats = seats.filter(
                    s => s.seat_type !== 'aisle' && s.seat_zone !== 'aisle'
                  )

                  // Unique zone names in appearance order
                  const zoneNames: string[] = []
                  realSeats.forEach(s => { if (!zoneNames.includes(s.seat_zone)) zoneNames.push(s.seat_zone) })
                  const zoneColorMap: Record<string, string> = {}
                  zoneNames.forEach((n, i) => { zoneColorMap[n] = ZONE_PALETTE[i % ZONE_PALETTE.length] })

                  // Group real seats by zone → row → sorted by col
                  type ZoneRows = Record<string, Record<string, Seat[]>>
                  const byZone: ZoneRows = {}
                  for (const s of realSeats) {
                    const z = s.seat_zone
                    const r = getRow(s)
                    if (!byZone[z]) byZone[z] = {}
                    if (!byZone[z][r]) byZone[z][r] = []
                    byZone[z][r].push(s)
                  }
                  // Sort each row's seats by col
                  for (const z of Object.keys(byZone)) {
                    for (const r of Object.keys(byZone[z])) {
                      byZone[z][r].sort((a, b) => getCol(a) - getCol(b))
                    }
                  }

                  return (
                    <>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-xl text-xs">
                        {zoneNames.map(name => (
                          <div key={name} className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: zoneColorMap[name] }}/>
                            <span className="text-gray-700 font-medium">{name} (ว่าง)</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d1d5db' }}/>
                          <span className="text-gray-500">ไม่ว่าง</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1e3a8a' }}/>
                          <span className="text-gray-500">เลือกแล้ว</span>
                        </div>
                      </div>

                      {/* Stage — shown once at the top */}
                      <div className="flex justify-center mb-3">
                        <div className="bg-gray-800 text-white text-xs font-bold px-10 py-1.5 rounded-xl">
                          STAGE / เวที
                        </div>
                      </div>

                      {zoneNames.map(zone => {
                        const zoneColor = zoneColorMap[zone]
                        const rows = byZone[zone] ?? {}
                        const sortedRows = Object.keys(rows).sort()

                        return (
                          <div key={zone} className="mb-5">
                            <div className="overflow-x-auto pb-1">
                              <div className="flex justify-center">
                              <div className="inline-flex flex-col gap-1">
                                {sortedRows.map(rowLabel => {
                                  const rowSeats = rows[rowLabel]
                                  return (
                                    <div key={rowLabel} className="flex items-center gap-1">
                                      <span className="w-5 text-center text-xs font-bold text-gray-400 flex-shrink-0">
                                        {rowLabel}
                                      </span>
                                      {rowSeats.map((seat, idx) => {
                                        const prev = rowSeats[idx - 1]
                                        const hasGap = prev && (getCol(seat) - getCol(prev) > 1)
                                        const isSelected  = selectedSeat?.seat_id === seat.seat_id
                                        const isAvailable = seat.status === 'available'
                                        const label = seat.display_label || seat.seat_number
                                        const bgColor = isSelected ? '#1e3a8a'
                                          : isAvailable ? zoneColor : '#d1d5db'
                                        return (
                                          <div key={seat.seat_id} className="flex items-center gap-1">
                                            {hasGap && (
                                              <div className="w-3 flex-shrink-0 flex items-center justify-center">
                                                <div className="w-px h-8 bg-gray-300 rounded"/>
                                              </div>
                                            )}
                                            <button
                                              onClick={() => isAvailable && setSelectedSeat(seat)}
                                              disabled={!isAvailable}
                                              className={`w-10 h-10 rounded-lg text-xs font-bold flex-shrink-0 transition-all duration-150 shadow-sm ${
                                                isSelected ? 'text-white ring-2 ring-white ring-offset-1 scale-110' :
                                                isAvailable ? 'text-white hover:scale-105 active:scale-95' :
                                                'text-gray-400 cursor-not-allowed'
                                              }`}
                                              style={{ backgroundColor: bgColor }}
                                            >
                                              {label}
                                            </button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })}
                              </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )
                })()}

                {selectedSeat && (
                  <div className="mt-4 card p-4 bg-primary-50 border border-primary-200">
                    <p className="text-sm text-primary-800 font-semibold">ที่นั่งที่เลือก</p>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-2xl font-bold text-primary-900">{selectedSeat.seat_number}</p>
                        <p className="text-xs text-primary-600">โซน {selectedSeat.seat_zone}</p>
                      </div>
                      <p className="font-bold text-primary-600 text-xl">{formatCurrency(selectedSeat.price)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Personal information */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg mb-4">ข้อมูลผู้ลงทะเบียน</h2>

            <div>
              <label className="label">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="ชื่อ-นามสกุลจริง"
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">ชื่อเล่น</label>
              <input
                type="text"
                className="input-field"
                placeholder="ชื่อเล่น (สำหรับแสดงบนบัตร)"
                value={form.customer_nickname}
                onChange={e => setForm(f => ({ ...f, customer_nickname: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
              <input
                type="tel"
                className="input-field"
                placeholder="0812345678"
                value={form.customer_phone}
                onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">อีเมล <span className="text-red-500">*</span></label>
              <input
                type="email"
                className="input-field"
                placeholder="example@email.com"
                value={form.customer_email}
                onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">ระบบจะส่ง PDF บัตรไปยังอีเมลนี้</p>
            </div>
          </div>
        )}

        {/* Step 2: Summary */}
        {step === 2 && event && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg mb-4">ยืนยันการลงทะเบียน</h2>

            <div className="card p-4 space-y-3">
              <h3 className="font-bold text-gray-900 border-b pb-2">รายละเอียดงาน</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">งาน</span>
                  <span className="font-medium text-right max-w-[200px]">{event.event_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">วันที่</span>
                  <span className="font-medium">{formatDate(event.event_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ประเภทบัตร</span>
                  <span className="font-medium">{selectedTicket?.ticket_name || selectedSeat?.seat_type || '-'}</span>
                </div>
                {selectedSeat && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">เลขที่นั่ง</span>
                    <span className="font-bold text-primary-600 text-base">{selectedSeat.seat_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="font-bold text-gray-900 border-b pb-2">ข้อมูลผู้ลงทะเบียน</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ชื่อ-นามสกุล</span>
                  <span className="font-medium">{form.customer_name}</span>
                </div>
                {form.customer_nickname && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">ชื่อเล่น</span>
                    <span className="font-medium">{form.customer_nickname}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">เบอร์โทร</span>
                  <span className="font-medium">{form.customer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">อีเมล</span>
                  <span className="font-medium text-right max-w-[200px]">{form.customer_email}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="card p-4 bg-primary-50 border border-primary-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary-900">ยอดที่ต้องชำระ</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(selectedTicket?.ticket_price ?? selectedSeat?.price ?? 0)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              กดยืนยันเพื่อดำเนินการชำระเงินผ่าน QR Code PromptPay
            </p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <div className="max-w-sm mx-auto space-y-2">
          <button
            onClick={step === 2 ? handleSubmit : handleNext}
            disabled={submitting}
            className="btn-primary w-full py-4 text-base"
          >
            {submitting
              ? 'กำลังดำเนินการ...'
              : step === 2
                ? 'ยืนยันและไปชำระเงิน'
                : 'ถัดไป'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <LiffProvider liffId={LIFF_ID}>
      <RegisterContent/>
    </LiffProvider>
  )
}
