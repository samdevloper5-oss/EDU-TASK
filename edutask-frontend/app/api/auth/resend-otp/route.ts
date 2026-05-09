import { NextResponse } from 'next/server'
import { resendOTPSchema } from '@/lib/validations/auth.schema'
import { sendEmailVerificationOTP, sendPasswordResetOTP } from '@/lib/auth/otp'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit(`resend-otp:${ip}`, 3, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
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

  const parsed = resendOTPSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { email, type } = parsed.data

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && user.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const sendFn = type === 'email_verify' ? sendEmailVerificationOTP : sendPasswordResetOTP
  const result = await sendFn(user?.id ?? '', email)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'Failed to resend OTP' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'A new verification code has been sent to your email.',
  })
}
