import { NextResponse } from 'next/server'
import { completeProfileSchema } from '@/lib/validations/auth.schema'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check email verified
  const { data: profileCheck } = await supabaseAdmin
    .from('users')
    .select('email_verified')
    .eq('id', user.id)
    .single()

  if (!profileCheck?.email_verified) {
    return NextResponse.json(
      { success: false, error: 'Email must be verified before completing profile.' },
      { status: 403 }
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

  const parsed = completeProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { name, phone, university, department, student_id_text, location, skills, referral_code } = parsed.data

  // Explicit allowlist update
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      name,
      phone,
      university,
      department,
      student_id_text,
      location: location ?? null,
      skills,
      profile_complete: true,
      referred_by: referral_code || null,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
