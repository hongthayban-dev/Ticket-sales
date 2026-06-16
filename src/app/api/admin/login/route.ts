import { NextResponse } from 'next/server'
import { getStaffByEmail, getStaffs, updateStaff } from '@/lib/sheets'
import { comparePassword, generateToken, COOKIE_NAME_EXPORT } from '@/lib/auth'
import { createAuditLog } from '@/lib/sheets'
import type { ApiResponse } from '@/types'

export async function POST(request: Request) {
  try {
    const { email, password, token: adminToken } = await request.json()

    let staff = null

    // Token-based login (super admin)
    if (adminToken) {
      const superToken = (process.env.SUPER_ADMIN_TOKEN || '').replace(/^﻿/, '')
      if (adminToken === superToken) {
        // Return super admin session
        const jwtToken = generateToken({
          staff_id: 'SUPER_ADMIN',
          staff_name: 'Super Admin',
          role: 'super_admin',
        })
        const response = NextResponse.json<ApiResponse>({
          success: true,
          data: { role: 'super_admin', staff_name: 'Super Admin', staff_id: 'SUPER_ADMIN' },
          message: 'เข้าสู่ระบบสำเร็จ',
        })
        response.cookies.set(COOKIE_NAME_EXPORT, jwtToken, {
          httpOnly: true, secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
        })
        return response
      }

      // Try to find staff with matching token
      const staffs = await getStaffs()
      staff = staffs.find(s => s.token === adminToken && s.status === 'active') ?? null
      if (!staff) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Token ไม่ถูกต้อง' }, { status: 401 })
      }
    } else if (email && password) {
      // Email + password login
      staff = await getStaffByEmail(email)
      if (!staff || staff.status !== 'active') {
        return NextResponse.json<ApiResponse>({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
      }
      if (!staff.password_hash) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'ยังไม่ได้ตั้งรหัสผ่าน' }, { status: 401 })
      }
      const valid = await comparePassword(password, staff.password_hash)
      if (!valid) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
      }
    } else {
      return NextResponse.json<ApiResponse>({ success: false, error: 'กรุณาระบุข้อมูลล็อกอิน' }, { status: 400 })
    }

    if (!staff) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบบัญชีนี้' }, { status: 401 })
    }

    const jwtToken = generateToken({
      staff_id: staff.staff_id,
      staff_name: staff.staff_name,
      role: staff.role,
      line_user_id: staff.line_user_id,
    })

    // Update last login
    await updateStaff(staff.staff_id, { last_login: new Date().toISOString() })

    await createAuditLog({
      action: 'STAFF_LOGIN',
      actor_id: staff.staff_id,
      actor_name: staff.staff_name,
      target_type: 'staff',
      target_id: staff.staff_id,
      details: `Role: ${staff.role}`,
    })

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        role: staff.role,
        staff_name: staff.staff_name,
        staff_id: staff.staff_id,
      },
      message: 'เข้าสู่ระบบสำเร็จ',
    })
    response.cookies.set(COOKIE_NAME_EXPORT, jwtToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
    })
    return response
  } catch (err) {
    console.error('POST /api/admin/login error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json<ApiResponse>({ success: true, message: 'ออกจากระบบแล้ว' })
  response.cookies.delete(COOKIE_NAME_EXPORT)
  return response
}
