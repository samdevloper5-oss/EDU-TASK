import { NextResponse } from 'next/server'
import { resetPasswordSchema } from '@/lib/validations/auth.schema'
import { verifyOTP } from '@/lib/auth/otp'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000)
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

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { email, otp, newPassword } = parsed.data

  const result = await verifyOTP(email, otp, 'password_reset')
  if (!result.valid) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  }

  const userId = result.userId!

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 500 }
    )
  }

  await supabaseAdmin.from('users').update({ password_reset_at: new Date().toISOString() }).eq('id', userId)

  return NextResponse.json({
    success: true,
    message: 'Password updated. You can now sign in.',
  })
}
