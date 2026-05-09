import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations/auth.schema'
import { sendEmailVerificationOTP } from '@/lib/auth/otp'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)
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

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { name, email, password } = parsed.data

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists.' },
      { status: 409 }
    )
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: false,
    user_metadata: { name },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { success: false, error: authError?.message ?? 'Registration failed' },
      { status: 500 }
    )
  }

  const userId = authData.user.id

  // Create public user record (trigger should also do this, but let's be safe)
  const { error: profileError } = await supabaseAdmin.from('users').insert({
    id: userId,
    email: email.toLowerCase().trim(),
    full_name: name,
    email_verified: false,
    trust_score: 20,
    phone: `temp_${userId.substring(0, 10)}`, // Temporary unique phone, will be updated during onboarding
    student_id: `temp_${userId.substring(0, 10)}`, // Temporary student ID, will be updated during onboarding
    university_name: 'Pending', // Will be updated during onboarding
    department: 'Pending', // Will be updated during onboarding
    location: 'Pending', // Will be updated during onboarding
    password_hash: 'supabase_auth', // Placeholder, handled by Supabase auth
    skills: [],
  })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    console.error('User data being inserted:', {
      id: userId,
      email: email.toLowerCase().trim(),
      full_name: name,
      email_verified: false,
      trust_score: 20,
      phone: `temp_${userId.substring(0, 10)}`,
      student_id: `temp_${userId.substring(0, 10)}`,
      university_name: 'Pending',
      department: 'Pending',
      location: 'Pending',
      password_hash: 'supabase_auth',
      skills: [],
    })
    // Rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { success: false, error: `Failed to create profile: ${profileError.message}` },
      { status: 500 }
    )
  }

  const otpResult = await sendEmailVerificationOTP(userId, email)
  if (!otpResult.success) {
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { success: false, error: otpResult.error ?? 'Failed to send OTP' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    userId,
    message: 'Account created! Please check your email for the verification code.',
  })
}
