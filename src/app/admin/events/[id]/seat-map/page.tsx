'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ToastProvider, showToast } from '@/components/ui/Toast'
import { ArrowLeft, Plus, Trash2, Save, RotateCcw, Grid } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Event, Seat } from '@/types'

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const AISLE_ID = '__aisle__'

interface Zone {
  id: string
  name: string
  color: string
  price: number
}

const DEFAULT_ZONES: Zone[] = [
  { id: 'z1', name: 'VIP',    color: '#ef4444', price: 500 },
  { id: 'z2', name: 'ทั่วไป', color: '#3b82f6', price: 200 },
]

// grid[row][col] = zone.id | '__aisle__' | null
type Grid = (string | null)[][]

type ToolMode = 'seat' | 'aisle' | 'erase'

function buildGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function seatsToGrid(seats: Seat[], rows: number, cols: number, zones: Zone[]): Grid {
  const grid = buildGrid(rows, cols)
  const zoneNames = new Set(zones.map(z => z.name))
  for (const seat of seats) {
    const r = ROW_LABELS.indexOf(seat.seat_row)
    const c = seat.seat_col - 1
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue
    if (seat.seat_type === 'aisle') {
      grid[r][c] = AISLE_ID
    } else {
      // Find zone by name
      const zone = zones.find(z => z.name === seat.seat_zone)
      grid[r][c] = zone?.id ?? null
    }
  }
  return grid
}

export default function SeatMapPage() {
  const params  = useParams()
  const router  = useRouter()
  const eventId = params.id as string

  const [event,   setEvent]   = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const [rows, setRows] = useState(8)
  const [cols, setCols] = useState(12)
  const [grid, setGrid] = useState<Grid>(() => buildGrid(8, 12))

  const [zones,      setZones]      = useState<Zone[]>(DEFAULT_ZONES)
  const [activeZone, setActiveZone] = useState<string>(DEFAULT_ZONES[0].id)
  const [toolMode,   setToolMode]   = useState<ToolMode>('seat')

  // Load event + existing seats
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/events?id=${eventId}`).then(r => r.json()),
      fetch(`/api/admin/seats/${eventId}`).then(r => r.json()),
    ]).then(([evRes, seatsRes]) => {
      if (evRes.success) {
        const list: Event[] = Array.isArray(evRes.data) ? evRes.data : [evRes.data]
        setEvent(list.find(e => e.event_id === eventId) || null)
      }
      if (seatsRes.success && seatsRes.data?.length > 0) {
        const seats: Seat[] = seatsRes.data
        const realSeats = seats.filter(s => s.seat_type !== 'aisle')
        // Rebuild zones from existing seats (preserve DEFAULT_ZONES colors by name)
        const palette = ['#ef4444','#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#6366f1','#f59e0b']
        const zoneMap = new Map<string, { price: number }>()
        for (const s of realSeats) {
          if (!zoneMap.has(s.seat_zone)) zoneMap.set(s.seat_zone, { price: s.price })
        }
        let restoredZones = DEFAULT_ZONES
        if (zoneMap.size > 0) {
          restoredZones = Array.from(zoneMap.entries()).map(([name, v], i) => ({
            id: `z${i + 1}`,
            name,
            color: DEFAULT_ZONES.find(d => d.name === name)?.color ?? palette[i % palette.length],
            price: v.price,
          }))
        }
        setZones(restoredZones)

        const maxRow = Math.max(...seats.map(s => ROW_LABELS.indexOf(s.seat_row)), rows - 1) + 1
        const maxCol = Math.max(...seats.map(s => s.seat_col), cols)
        const r = Math.max(maxRow, 8)
        const c = Math.max(maxCol, 12)
        setRows(r); setCols(c)
        setGrid(seatsToGrid(seats, r, c, restoredZones))
      }
    }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const handleCellClick = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      const current = next[r][c]

      if (toolMode === 'erase') {
        next[r][c] = null
      } else if (toolMode === 'aisle') {
        next[r][c] = current === AISLE_ID ? null : AISLE_ID
      } else {
        // seat mode
        next[r][c] = current === activeZone ? null : activeZone
      }
      return next
    })
  }, [activeZone, toolMode])

  const handleFillRow = (r: number) => {
    if (toolMode !== 'seat' || !activeZone) return
    setGrid(prev => { const n = prev.map(row => [...row]); n[r] = Array(cols).fill(activeZone); return n })
  }

  const handleClearRow = (r: number) => {
    setGrid(prev => { const n = prev.map(row => [...row]); n[r] = Array(cols).fill(null); return n })
  }

  const handleApplyGrid = () => setGrid(buildGrid(rows, cols))

  const getZoneById = (id: string) => zones.find(z => z.id === id)

  const countSeats = () => grid.flat().filter(v => v && v !== AISLE_ID).length
  const countAisles = () => grid.flat().filter(v => v === AISLE_ID).length

  const handleSave = async () => {
    const seats: Seat[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        const rowLabel = ROW_LABELS[r]
        const colNum = c + 1

        if (cell === AISLE_ID) {
          seats.push({
            seat_id: uuidv4(), event_id: eventId,
            seat_number: `aisle-${rowLabel}${colNum}`,
            seat_zone: 'aisle', seat_row: rowLabel, seat_col: colNum,
            ticket_type_id: '', seat_type: 'aisle',
            price: 0, status: 'unavailable' as Seat['status'],
            display_label: '-',
          })
        } else {
          const zone = getZoneById(cell)
          if (!zone) continue
          const label = `${rowLabel}${colNum}`
          seats.push({
            seat_id: uuidv4(), event_id: eventId,
            seat_number: label, seat_zone: zone.name,
            seat_row: rowLabel, seat_col: colNum,
            ticket_type_id: '', seat_type: 'normal',
            price: zone.price, status: 'available',
            display_label: label,
          })
        }
      }
    }

    setSaving(true)
    try {
      const res  = await fetch(`/api/admin/seats/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast('success', `บันทึก ${countSeats()} ที่นั่ง สำเร็จ`)
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const addZone = () => {
    const palette = ['#8b5cf6','#ec4899','#f97316','#10b981','#6366f1','#f59e0b']
    const z: Zone = { id: uuidv4(), name: `โซน ${zones.length + 1}`, color: palette[zones.length % palette.length], price: 100 }
    setZones(prev => [...prev, z])
    setActiveZone(z.id)
    setToolMode('seat')
  }

  const updateZone = (id: string, field: keyof Zone, val: string | number) =>
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: val } : z))

  const removeZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id))
    setGrid(prev => prev.map(row => row.map(cell => cell === id ? null : cell)))
    if (activeZone === id) { setActiveZone(zones.find(z => z.id !== id)?.id ?? ''); setToolMode('seat') }
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
      <div className="space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5"/>
            <span className="text-sm font-medium">กลับ</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{countSeats()} ที่นั่ง · {countAisles()} ทางเดิน</span>
            <button onClick={handleSave} disabled={saving || countSeats() === 0}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary-700 disabled:opacity-50">
              <Save className="w-4 h-4"/>
              {saving ? 'กำลังบันทึก...' : 'บันทึกผัง'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Grid size */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Grid className="w-4 h-4 text-primary-600"/>ขนาดตาราง
              </h3>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">แถว (A–Z)</span>
                  <input type="number" min={1} max={26} value={rows}
                    onChange={e => setRows(Math.min(26, Math.max(1, +e.target.value)))}
                    className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm"/>
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">คอลัมน์</span>
                  <input type="number" min={1} max={30} value={cols}
                    onChange={e => setCols(Math.min(30, Math.max(1, +e.target.value)))}
                    className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm"/>
                </label>
                <button onClick={handleApplyGrid}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-700 mt-1">
                  <RotateCcw className="w-3.5 h-3.5"/>รีเซ็ตตาราง
                </button>
              </div>
            </div>

            {/* Tools */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">เครื่องมือ</h3>

              {/* Zones */}
              <div className="space-y-1.5 mb-3">
                {zones.map(zone => (
                  <div key={zone.id}
                    onClick={() => { setActiveZone(zone.id); setToolMode('seat') }}
                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer border-2 transition-all ${
                      toolMode === 'seat' && activeZone === zone.id ? 'border-gray-800 bg-gray-50' : 'border-transparent hover:border-gray-200'
                    }`}>
                    <input type="color" value={zone.color}
                      onChange={e => updateZone(zone.id, 'color', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-7 h-7 rounded cursor-pointer border-0 flex-shrink-0"/>
                    <input type="text" value={zone.name}
                      onChange={e => updateZone(zone.id, 'name', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-xs min-w-0"/>
                    <span className="text-xs text-gray-400">฿</span>
                    <input type="number" value={zone.price} min={0}
                      onChange={e => updateZone(zone.id, 'price', +e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-16 border border-gray-200 rounded px-2 py-0.5 text-xs text-right"/>
                    {zones.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); removeZone(zone.id) }}
                        className="text-gray-300 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addZone}
                className="w-full flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-700 py-1.5 border border-dashed border-primary-300 rounded-xl hover:bg-primary-50 mb-3">
                <Plus className="w-3.5 h-3.5"/>เพิ่มโซน
              </button>

              {/* Aisle + Erase tools */}
              <div className="space-y-1.5">
                <button
                  onClick={() => setToolMode(toolMode === 'aisle' ? 'seat' : 'aisle')}
                  className={`w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl border-2 transition-all ${
                    toolMode === 'aisle'
                      ? 'border-gray-800 bg-gray-100 font-semibold'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}>
                  <span className="w-7 h-7 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">—</span>
                  ทางเดิน (Aisle)
                </button>
                <button
                  onClick={() => setToolMode(toolMode === 'erase' ? 'seat' : 'erase')}
                  className={`w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl border-2 transition-all ${
                    toolMode === 'erase'
                      ? 'border-red-400 bg-red-50 font-semibold text-red-700'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}>
                  <Trash2 className="w-4 h-4 flex-shrink-0"/>
                  ลบ (Erase)
                </button>
              </div>
            </div>
          </div>

          {/* ── Grid area ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 overflow-x-auto">
            {/* Tool hint */}
            <p className="text-xs text-gray-500 mb-3">
              {toolMode === 'aisle'  && '— คลิกเพื่อวางทางเดิน คลิกซ้ำเพื่อลบ'}
              {toolMode === 'erase'  && '🗑️ คลิกเพื่อลบ'}
              {toolMode === 'seat'   && `🎨 คลิกเพื่อวางที่นั่ง (โซน: ${getZoneById(activeZone)?.name || '-'})`}
            </p>

            {/* Stage */}
            <div className="flex justify-center mb-1">
              <div className="relative">
                <div className="bg-gray-800 text-white text-sm font-bold px-12 py-2 rounded-xl">
                  STAGE / เวที
                </div>
                {/* Arrow pointing down to seats */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-gray-400 text-lg leading-none">▼</div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-400 mb-3">ทิศทางหันหน้าเข้าหาเวที</div>

            {/* Grid */}
            <div className="inline-flex flex-col gap-0.5">
              {/* Col header */}
              <div className="flex gap-0.5 ml-8">
                {Array.from({ length: cols }, (_, c) => (
                  <div key={c} className="w-9 h-5 text-center text-xs text-gray-400 flex items-center justify-center">
                    {c + 1}
                  </div>
                ))}
                <div className="w-16"/> {/* space for row buttons */}
              </div>

              {/* Seat rows */}
              {Array.from({ length: rows }, (_, r) => (
                <div key={r} className="flex items-center gap-0.5">
                  {/* Row label */}
                  <div className="w-7 text-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {ROW_LABELS[r]}
                  </div>

                  {/* Cells */}
                  {Array.from({ length: cols }, (_, c) => {
                    const cell = grid[r]?.[c] ?? null
                    const zone = cell && cell !== AISLE_ID ? getZoneById(cell) : null
                    const isAisle = cell === AISLE_ID

                    if (isAisle) {
                      return (
                        <button key={c} onClick={() => handleCellClick(r, c)}
                          className="w-9 h-9 rounded border-2 border-dashed border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
                          title="ทางเดิน">
                          <span className="text-gray-400 text-xs font-bold">—</span>
                        </button>
                      )
                    }

                    return (
                      <button key={c} onClick={() => handleCellClick(r, c)}
                        className={`w-9 h-9 rounded text-xs font-bold border transition-all hover:opacity-80 ${
                          cell ? 'text-white border-transparent shadow-sm' : 'bg-gray-100 border-gray-200 text-gray-300 hover:bg-gray-200'
                        }`}
                        style={{ backgroundColor: zone?.color }}
                        title={zone ? `${zone.name} ฿${zone.price}` : 'ว่าง'}>
                        {cell ? `${ROW_LABELS[r]}${c + 1}` : ''}
                      </button>
                    )
                  })}

                  {/* Row quick actions */}
                  <div className="flex gap-1 ml-1 flex-shrink-0">
                    <button onClick={() => handleFillRow(r)}
                      className="text-xs px-1.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded whitespace-nowrap"
                      title="เติมทั้งแถว">เติม</button>
                    <button onClick={() => handleClearRow(r)}
                      className="text-xs px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded whitespace-nowrap"
                      title="ล้างแถวนี้">ล้าง</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100 items-center">
              {zones.map(z => (
                <div key={z.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: z.color }}/>
                  <span className="text-gray-700">{z.name} — ฿{z.price.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-4 h-4 rounded border-2 border-dashed border-gray-300 bg-gray-100"/>
                <span className="text-gray-500">ทางเดิน</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save bottom */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving || countSeats() === 0}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50">
            <Save className="w-5 h-5"/>
            {saving ? 'กำลังบันทึก...' : `บันทึกผังที่นั่ง (${countSeats()} ที่)`}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
