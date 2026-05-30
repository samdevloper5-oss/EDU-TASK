import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(errorDescription ?? 'Authentication failed')}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError.message)
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent('Verification link expired. Request a new code.')}`
      )
    }

    if (data.user) {
      await supabaseAdmin
        .from('users')
        .update({ email_verified: true })
        .eq('id', data.user.id)

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('profile_complete, is_admin')
        .eq('id', data.user.id)
        .single()

      if (profile?.is_admin) {
        return NextResponse.redirect(`${origin}/admin`)
      }

      const redirectTo = profile?.profile_complete ? next : '/onboarding'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=verification_failed`)
}
