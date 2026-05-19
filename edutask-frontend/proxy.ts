import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = [
  '/dashboard',
  '/tasks',
  '/post-task',
  '/my-tasks',
  '/chat',
  '/wallet',
  '/profile',
  '/leaderboard',
]
const ADMIN_ONLY = ['/admin']
const AUTH_ROUTES = ['/signin', '/signup', '/forgot-password', '/reset-otp', '/reset-password']
const OTP_GATE = ['/verify-otp']
const ONBOARDING = ['/onboarding']

function isPathMatch(path: string, prefixes: string[]) {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (
      isPathMatch(pathname, PROTECTED) ||
      isPathMatch(pathname, ADMIN_ONLY) ||
      isPathMatch(pathname, OTP_GATE) ||
      isPathMatch(pathname, ONBOARDING)
    ) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }

    return response
  }

  let profile: {
    email_verified: boolean
    profile_complete: boolean
    is_banned: boolean
    is_admin: boolean
  } | null = null

  try {
    const { data: profileData } = await supabase
      .from('users')
      .select('email_verified, profile_complete, is_banned, is_admin')
      .eq('id', user.id)
      .single()

    profile = profileData
  } catch {
    profile = null
  }

  const emailVerified = profile?.email_verified ?? false
  const profileComplete = profile?.profile_complete ?? false
  const isBanned = profile?.is_banned ?? false
  const isAdmin = profile?.is_admin ?? false

  if (isBanned) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/signin?reason=banned', request.url))
  }

  if (!emailVerified) {
    if (isPathMatch(pathname, [...PROTECTED, ...ADMIN_ONLY, ...ONBOARDING, ...AUTH_ROUTES])) {
      return NextResponse.redirect(new URL('/verify-otp', request.url))
    }

    return response
  }

  if (!profileComplete) {
    if (isPathMatch(pathname, [...PROTECTED, ...ADMIN_ONLY, ...AUTH_ROUTES, ...OTP_GATE])) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    return response
  }

  if (isPathMatch(pathname, [...AUTH_ROUTES, ...OTP_GATE, ...ONBOARDING])) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isPathMatch(pathname, ADMIN_ONLY) && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.).*)'],
}
