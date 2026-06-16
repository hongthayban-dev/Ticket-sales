import { NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { ApiResponse } from '@/types'

const FOLDER_BY_TYPE: Record<string, string> = {
  banner: 'banner',
  event:  'banner',
  qr:     'QrCode',
}
const DEFAULT_FOLDER = 'banner'

export async function POST(request: Request) {
  const payload = getAuthPayload()
  if (!payload) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'image'

    if (!file) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ไฟล์ใหญ่เกิน 5MB' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const filename = `${type}_${timestamp}.${ext}`

    const folder = FOLDER_BY_TYPE[type] || DEFAULT_FOLDER
    const buffer = Buffer.from(await file.arrayBuffer())
    const { id, url } = await uploadToCloudinary(buffer, filename, folder)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { fileId: id, url },
      message: 'อัปโหลดสำเร็จ',
    })
  } catch (err) {
    console.error('Upload error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json<ApiResponse>({ success: false, error: msg }, { status: 500 })
  }
}
