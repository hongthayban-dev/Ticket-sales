import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getStaffs, createStaff, updateStaff, createAuditLog } from '@/lib/sheets'
import { hashPassword, generateToken, getAuthPayload, requireRole } from '@/lib/auth'
import type { ApiResponse, Staff } from '@/types'

export async function GET() {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const staffs = await getStaffs()
    // Don't expose password hashes
    const safe = staffs.map(({ password_hash, token, ...s }) => s)
    return NextResponse.json<ApiResponse>({ success: true, data: safe })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch staffs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { staff_name, role, email, phone, password, line_user_id } = body

    if (!staff_name || !role) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }

    const staff_id = `STF-${uuidv4().slice(0, 8).toUpperCase()}`
    const token = generateToken({ staff_id, staff_name, role })
    const password_hash = password ? await hashPassword(password) : undefined

    const staff: Staff = {
      staff_id,
      line_user_id: line_user_id || undefined,
      staff_name,
      role,
      phone: phone || undefined,
      email: email || undefined,
      password_hash,
      token,
      status: 'active',
      created_at: new Date().toISOString(),
      created_by: payload.staff_id,
    }

    await createStaff(staff)
    await createAuditLog({
      action: 'STAFF_CREATED',
      actor_id: payload.staff_id,
      actor_name: payload.staff_name,
      target_type: 'staff',
      target_id: staff_id,
      details: `Name: ${staff_name}, Role: ${role}`,
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { staff_id, staff_name, role, token },
      message: 'สร้างบัญชีเจ้าหน้าที่สำเร็จ',
    })
  } catch (err) {
    console.error('POST /api/admin/staffs error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to create staff' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const payload = getAuthPayload()
  if (!payload || !requireRole('super_admin')(payload)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { staff_id, password, ...updates } = await request.json()
    if (!staff_id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'staff_id required' }, { status: 400 })
    }

    if (password) {
      updates.password_hash = await hashPassword(password)
    }

    await updateStaff(staff_id, updates)
    return NextResponse.json<ApiResponse>({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' })
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to update staff' }, { status: 500 })
  }
}
