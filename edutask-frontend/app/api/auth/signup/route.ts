import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations/auth.schema'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'signup', 5, 15 * 60 * 1000).ok) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { name, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    const errorMessage = error.message.toLowerCase()
    if (
      errorMessage.includes('already registered') ||
      errorMessage.includes('already been registered')
    ) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Unable to create account. Please try again.' },
      { status: 400 }
    )
  }

  if (data.user) {
    await supabaseAdmin
      .from('users')
      .update({ full_name: name })
      .eq('id', data.user.id)
  }

  return NextResponse.json({
    success: true,
    message: 'Check your email for the 6-digit verification code.',
    userId: data.user?.id,
  })
}

