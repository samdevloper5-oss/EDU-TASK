import { NextResponse } from 'next/server'
import { resendOTPSchema } from '@/lib/validations/auth.schema'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'resend-otp', 3, 60 * 1000).ok) {
    return NextResponse.json(
      { success: false, error: 'Please wait before requesting another code.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = resendOTPSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 })
  }

  const { email, type } = parsed.data
  const supabase = await createServerSupabaseClient()
  const normalizedEmail = email.toLowerCase().trim()
  const resendType = type === 'signup' ? 'signup' : 'email_change'

  const { error } = await supabase.auth.resend({
    type: resendType,
    email: normalizedEmail,
  })

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Unable to resend code. Please try again.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'New code sent to your email.',
  })
}
