import { NextResponse } from 'next/server'
import { completeProfileSchema } from '@/lib/validations/auth.schema'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-auth'
import { sanitizeText } from '@/lib/utils'

export async function POST(request: Request) {
  const { user, profile } = await requireAuth()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!profile?.email_verified) {
    return NextResponse.json(
      { success: false, error: 'Email must be verified before completing profile.' },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = completeProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { name, phone, university, department, student_id_text, location, skills, referral_code } = parsed.data
  const sanitizedLocation = location ? sanitizeText(location) : ''
  const sanitizedSkills = skills.map((skill) => sanitizeText(skill))

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      full_name: name,
      phone,
      university_name: university,
      department,
      student_id_text,
      location: sanitizedLocation,
      skills: sanitizedSkills,
      profile_complete: true,
      referred_by: referral_code || null,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
