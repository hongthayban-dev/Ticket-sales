'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { ArrowLeft, Plus, Trash2, Save, RotateCcw, Grid } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Event, Seat } from '@/types'

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface Zone {
  id: string
  name: string
  color: string
  price: number
}

const DEFAULT_ZONES: Zone[] = [
  { id: 'z1', name: 'VIP', color: '#ef4444', price: 500 },
  { id: 'z2', name: 'ทั่วไป', color: '#3b82f6', price: 200 },
]

// grid[row][col] = zone.id | null
type Grid = (string | null)[][]

function buildGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function seatsToGrid(seats: Seat[], rows: number, cols: number): Grid {
  const grid = buildGrid(rows, cols)
  for (const seat of seats) {
    const r = ROW_LABELS.indexOf(seat.seat_row)
    const c = seat.seat_col - 1
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      grid[r][c] = seat.seat_zone
    }
  }
  return grid
}

export default function SeatMapPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [rows, setRows] = useState(8)
  const [cols, setCols] = useState(12)
  const [grid, setGrid] = useState<Grid>(() => buildGrid(8, 12))
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES)
  const [activeZone, setActiveZone] = useState<string | null>(DEFAULT_ZONES[0].id)
  const [isErasing, setIsErasing] = useState(false)

  // Load event + existing seats
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/events?id=${eventId}`).then(r => r.json()),
      fetch(`/api/admin/seats/${eventId}`, { headers: { credentials: 'include' } }).then(r => r.json()),
    ]).then(([evRes, seatsRes]) => {
      if (evRes.success) {
        const ev = evRes.data?.find?.((e: Event) => e.event_id === eventId) || evRes.data
        setEvent(ev || null)
      }
      if (seatsRes.success && seatsRes.data?.length > 0) {
        const seats: Seat[] = seatsRes.data
        // Detect grid dimensions from existing seats
        const maxRow = Math.max(...seats.map(s => ROW_LABELS.indexOf(s.seat_row))) + 1
        const maxCol = Math.max(...seats.map(s => s.seat_col))
        const r = Math.max(maxRow, 8)
        const c = Math.max(maxCol, 12)
        setRows(r)
        setCols(c)
        setGrid(seatsToGrid(seats, r, c))
        // Restore zones from seats
        const zoneMap = new Map<string, Zone>()
        for (const seat of seats) {
          if (!zoneMap.has(seat.seat_zone)) {
            zoneMap.set(seat.seat_zone, {
              id: seat.seat_zone,
              name: seat.seat_zone,
              color: seat.display_label?.startsWith('#') ? seat.display_label : '#3b82f6',
              price: seat.price,
            })
          }
        }
        if (zoneMap.size > 0) setZones(Array.from(zoneMap.values()))
      }
    }).finally(() => setLoading(false))
  }, [eventId])

  const handleCellClick = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      if (isErasing || next[r][c] === activeZone) {
        next[r][c] = null
      } else {
        next[r][c] = activeZone
      }
      return next
    })
  }, [activeZone, isErasing])

  const handleFillRow = (r: number) => {
    if (!activeZone || isErasing) return
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[r] = Array(cols).fill(activeZone)
      return next
    })
  }

  const handleClearRow = (r: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[r] = Array(cols).fill(null)
      return next
    })
  }

  const handleApplyGrid = () => {
    setGrid(buildGrid(rows, cols))
  }

  const countSeats = () => grid.flat().filter(Boolean).length

  const getZoneById = (id: string) => zones.find(z => z.id === id)

  const handleSave = async () => {
    const zoneIdToZone = new Map(zones.map(z => [z.id, z]))
    const seats: Seat[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const zoneId = grid[r][c]
        if (!zoneId) continue
        const zone = zoneIdToZone.get(zoneId)
        if (!zone) continue
        const rowLabel = ROW_LABELS[r]
        const colNum = c + 1
        const seatNumber = `${rowLabel}${colNum}`
        seats.push({
          seat_id: uuidv4(),
          event_id: eventId,
          seat_number: seatNumber,
          seat_zone: zone.name,
          seat_row: rowLabel,
          seat_col: colNum,
          ticket_type_id: '',
          seat_type: 'normal',
          price: zone.price,
          status: 'available',
          display_label: seatNumber,
        })
      }
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/seats/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast('success', data.message || 'บันทึกผังที่นั่งสำเร็จ')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const addZone = () => {
    const colors = ['#8b5cf6', '#ec4899', '#f97316', '#10b981', '#6366f1']
    const newZone: Zone = {
      id: uuidv4(),
      name: `โซน ${zones.length + 1}`,
      color: colors[zones.length % colors.length],
      price: 100,
    }
    setZones(z => [...z, newZone])
    setActiveZone(newZone.id)
  }

  const updateZone = (id: string, field: keyof Zone, value: string | number) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z))
  }

  const removeZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id))
    setGrid(prev => prev.map(row => row.map(cell => cell === id ? null : cell)))
    if (activeZone === id) setActiveZone(zones[0]?.id ?? null)
  }

  if (loading) {
    return (
      <AdminLayout title="ผังที่นั่ง">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`ผังที่นั่ง${event ? `: ${event.event_name}` : ''}`}>
      <ToastProvider/>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5"/>
            <span className="text-sm font-medium">กลับ</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">รวม {countSeats()} ที่นั่ง</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4"/>
              {saving ? 'กำลังบันทึก...' : 'บันทึกผังที่นั่ง'}
            </button>
          </div>
        </div>

        {/* Grid config */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Grid className="w-4 h-4 text-primary-600"/>
            ขนาดตาราง
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 w-16">แถว (A-Z)</span>
              <input
                type="number" min={1} max={26} value={rows}
                onChange={e => setRows(Math.min(26, Math.max(1, Number(e.target.value))))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 w-16">คอลัมน์</span>
              <input
                type="number" min={1} max={30} value={cols}
                onChange={e => setCols(Math.min(30, Math.max(1, Number(e.target.value))))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm"
              />
            </label>
            <button
              onClick={handleApplyGrid}
              className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-700"
            >
              <RotateCcw className="w-3.5 h-3.5"/>
              รีเซ็ตตาราง
            </button>
          </div>
        </div>

        {/* Zone management */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">โซน (Zone)</h3>
            <button onClick={addZone} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4"/>เพิ่มโซน
            </button>
          </div>
          <div className="space-y-2">
            {zones.map(zone => (
              <div key={zone.id} className={`flex items-center gap-3 p-2 rounded-xl border-2 cursor-pointer transition-all ${activeZone === zone.id && !isErasing ? 'border-gray-900' : 'border-gray-100'}`}
                onClick={() => { setActiveZone(zone.id); setIsErasing(false) }}>
                <input
                  type="color" value={zone.color}
                  onChange={e => updateZone(zone.id, 'color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                  onClick={e => e.stopPropagation()}
                />
                <input
                  type="text" value={zone.name}
                  onChange={e => updateZone(zone.id, 'name', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm min-w-0"
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">฿</span>
                  <input
                    type="number" value={zone.price} min={0}
                    onChange={e => updateZone(zone.id, 'price', Number(e.target.value))}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                {zones.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeZone(zone.id) }}
                    className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                )}
                {activeZone === zone.id && !isErasing && (
                  <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">ใช้งาน</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => { setIsErasing(e => !e); if (!isErasing) setActiveZone(null) }}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${isErasing ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Trash2 className="w-4 h-4"/>
              {isErasing ? 'โหมดลบ (กำลังใช้งาน)' : 'โหมดลบที่นั่ง'}
            </button>
          </div>
        </div>

        {/* Visual grid */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 overflow-x-auto">
          <p className="text-xs text-gray-500 mb-3">
            {isErasing ? '🗑️ คลิกที่นั่งเพื่อลบ' : `🎨 คลิกเพื่อวางที่นั่ง (โซน: ${getZoneById(activeZone || '')?.name || '-'})`}
          </p>

          {/* Stage indicator */}
          <div className="flex justify-center mb-4">
            <div className="bg-gray-800 text-white text-xs px-8 py-1.5 rounded-full">STAGE / เวที</div>
          </div>

          <div className="inline-flex flex-col gap-1">
            {/* Col header */}
            <div className="flex gap-1 ml-8">
              {Array.from({ length: cols }, (_, c) => (
                <div key={c} className="w-8 h-5 text-center text-xs text-gray-400 flex items-center justify-center">
                  {c + 1}
                </div>
              ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex items-center gap-1">
                {/* Row label */}
                <div className="w-7 text-center text-xs font-bold text-gray-500">{ROW_LABELS[r]}</div>

                {/* Cells */}
                {Array.from({ length: cols }, (_, c) => {
                  const zoneId = grid[r]?.[c] ?? null
                  const zone = zoneId ? getZoneById(zoneId) : null
                  return (
                    <button
                      key={c}
                      onClick={() => handleCellClick(r, c)}
                      className={`w-8 h-8 rounded text-xs font-bold border transition-all hover:opacity-80 ${
                        zoneId ? 'text-white border-transparent' : 'bg-gray-100 border-gray-200 text-gray-300 hover:bg-gray-200'
                      }`}
                      style={{ backgroundColor: zone?.color }}
                      title={zone ? `${zone.name} - ฿${zone.price}` : 'ว่าง'}
                    >
                      {zoneId ? ROW_LABELS[r] + (c + 1) : ''}
                    </button>
                  )
                })}

                {/* Row actions */}
                <div className="flex gap-1 ml-1">
                  <button
                    onClick={() => handleFillRow(r)}
                    className="text-xs px-1.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded"
                    title="เติมทั้งแถว"
                  >เติม</button>
                  <button
                    onClick={() => handleClearRow(r)}
                    className="text-xs px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded"
                    title="ล้างแถวนี้"
                  >ล้าง</button>
                </div>
              </div>
            ))}
          </div>

          {/* Zone legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-1.5 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: z.color }}/>
                <span className="text-gray-700">{z.name} — ฿{z.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || countSeats() === 0}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-5 h-5"/>
            {saving ? 'กำลังบันทึก...' : `บันทึกผังที่นั่ง (${countSeats()} ที่)`}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
