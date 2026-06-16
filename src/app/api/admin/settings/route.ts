import { NextResponse } from 'next/server'
import { getSettings, setSetting, createAuditLog } from '@/lib/sheets'
import { getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse } from '@/types'

export async function GET() {
  const payload = getAuthPayload()
  if (!payload || !requireRole('admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await getSettings()
    return NextResponse.json<ApiResponse>({ success: true, data: settings })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings: Record<string, string> = await request.json()
    for (const [key, value] of Object.entries(settings)) {
      await setSetting(key, value, payload.staff_name)
    }

    await createAuditLog({
      action: 'SETTINGS_UPDATED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'settings',
      target_id: 'global',
      details: Object.keys(settings).join(', '),
    })

    return NextResponse.json<ApiResponse>({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to save settings' }, { status: 500 })
  }
}
