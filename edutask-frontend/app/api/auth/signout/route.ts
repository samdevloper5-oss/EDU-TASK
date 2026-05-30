import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Signout error:', error.message)
  }

  const response = NextResponse.redirect(
    new URL('/signin', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  )

  // Explicitly clear all Supabase auth cookies
  response.cookies.set('sb-lahfflahtbmgckochhex-auth-token', '', {
    maxAge: 0,
    path: '/',
  })
  response.cookies.set('sb-lahfflahtbmgckochhex-auth-token-code-verifier', '', {
    maxAge: 0,
    path: '/',
  })

  return response
}
