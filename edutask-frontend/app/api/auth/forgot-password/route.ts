import { NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/lib/validations/auth.schema'
import { sendPasswordResetOTP } from '@/lib/auth/otp'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000)
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

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  // Always return same response to prevent email enumeration
  const standardResponse = {
    success: true,
    message: 'If that email exists, a reset code was sent.',
  }

  // Look up user
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
  const foundUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)

  if (foundUser) {
    await sendPasswordResetOTP(foundUser.id, normalizedEmail)
  }

  return NextResponse.json(standardResponse)
}
