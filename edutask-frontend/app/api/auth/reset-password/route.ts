import { NextResponse } from 'next/server'
import { resetPasswordSchema } from '@/lib/validations/auth.schema'
import { createClient } from '@/utils/supabase/server'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'reset-password', 5, 15 * 60 * 1000).ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { email, token, newPassword } = parsed.data
  const supabase = await createClient()

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: email.toLowerCase().trim(),
    token,
    type: 'recovery',
  })

  if (verifyError) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired reset code.' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Unable to update password. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Password updated. You can now sign in.',
  })
}

