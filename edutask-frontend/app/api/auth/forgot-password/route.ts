import { NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/lib/validations/auth.schema'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'forgot-password', 3, 15 * 60 * 1000).ok) {
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

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`

  await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase().trim(), {
    redirectTo,
  })

  return NextResponse.json({
    success: true,
    message: 'If that email exists, a reset code was sent.',
  })
}
