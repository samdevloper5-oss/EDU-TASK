import { NextResponse } from 'next/server'
import { verifyOTPSchema } from '@/lib/validations/auth.schema'
import { verifyOTP } from '@/lib/auth/otp'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit(`verify-otp:${ip}`, 10, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parsed = verifyOTPSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { email, otp, type } = parsed.data
  const result = await verifyOTP(email, otp, type)

  if (!result.valid) {
    return NextResponse.json(
      { success: false, error: result.error, remaining: result.remaining ?? 0 },
      { status: 400 }
    )
  }

  const userId = result.userId!

  if (type === 'email_verify') {
    await supabaseAdmin.from('users').update({ email_verified: true }).eq('id', userId)
    await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true })
  }

  return NextResponse.json({
    success: true,
    type,
    message: type === 'email_verify' ? 'Email verified successfully!' : 'OTP verified successfully!',
  })
}
