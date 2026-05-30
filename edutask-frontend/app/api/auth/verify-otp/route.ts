import { NextResponse } from 'next/server'
import { verifyOTPSchema } from '@/lib/validations/auth.schema'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'verify-otp', 10, 15 * 60 * 1000).ok) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = verifyOTPSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid OTP format' }, { status: 400 })
  }

  const { email, token, type } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.toLowerCase().trim(),
    token,
    type,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    const userMessage = msg.includes('expired')
      ? 'Code has expired. Please request a new one.'
      : msg.includes('invalid')
        ? 'Invalid code. Please check and try again.'
        : 'Verification failed. Please try again.'
    return NextResponse.json({ success: false, error: userMessage }, { status: 400 })
  }

  let isAdmin = false

  if (data.user && (type === 'signup' || type === 'email')) {
    await supabaseAdmin
      .from('users')
      .update({ email_verified: true })
      .eq('id', data.user.id)

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', data.user.id)
      .single()

    isAdmin = profile?.is_admin ?? false
  }

  return NextResponse.json({
    success: true,
    message: 'Email verified successfully!',
    needsOnboarding: !isAdmin,
    isAdmin,
  })
}

