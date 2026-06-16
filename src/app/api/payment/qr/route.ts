import { NextResponse } from 'next/server'
import { getRegistrationById, getEventById, getPaymentByRegId } from '@/lib/sheets'
import type { ApiResponse } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const regId = searchParams.get('reg_id')

  if (!regId) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'reg_id is required' }, { status: 400 })
  }

  try {
    const [registration, payment] = await Promise.all([
      getRegistrationById(regId),
      getPaymentByRegId(regId),
    ])

    if (!registration) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Registration not found' }, { status: 404 })
    }

    const event = await getEventById(registration.event_id)
    const amount = payment?.amount_due ?? registration.total_amount

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        qr_image: event?.promptpay_qr_url || null,
        amount,
        reg_id: regId,
      },
    })
  } catch (err) {
    console.error('GET /api/payment/qr error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to load QR' }, { status: 500 })
  }
}
