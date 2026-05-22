import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=verification_failed`)
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/signin?error=verification_failed`)
  }

  await supabaseAdmin
    .from('users')
    .update({ email_verified: true })
    .eq('id', data.user.id)

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('profile_complete')
    .eq('id', data.user.id)
    .single()

  const redirectTo = profile?.profile_complete ? '/dashboard' : '/onboarding'
  return NextResponse.redirect(`${origin}${redirectTo}`)
}
