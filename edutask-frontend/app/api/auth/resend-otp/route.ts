import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'resend-otp', 3, 15 * 60 * 1000).ok) {
    return NextResponse.json(
      { success: false, error: 'Too many resend attempts. Wait 15 minutes.' },
      { status: 429 }
    )
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.toLowerCase().trim(),
  })

  if (error) {
    return NextResponse.json({ success: false, error: 'Failed to resend code' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
