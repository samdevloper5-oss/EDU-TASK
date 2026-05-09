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
  return prefixes.some((p) => path === p || path.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and API routes
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

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No user
  if (!user) {
    if (
      isPathMatch(pathname, PROTECTED) ||
      isPathMatch(pathname, ADMIN_ONLY) ||
      isPathMatch(pathname, OTP_GATE) ||
      isPathMatch(pathname, ONBOARDING)
    ) {
      const signinUrl = new URL('/signin', request.url)
      return NextResponse.redirect(signinUrl)
    }
    return response
  }

  // Fetch profile state
  const { data: profile } = await supabase
    .from('users')
    .select('email_verified, profile_complete, is_banned, is_admin')
    .eq('id', user.id)
    .single()

  const emailVerified = profile?.email_verified ?? false
  const profileComplete = profile?.profile_complete ?? false
  const isBanned = profile?.is_banned ?? false
  const isAdmin = profile?.is_admin ?? false

  // Banned
  if (isBanned) {
    await supabase.auth.signOut()
    const signinUrl = new URL('/signin?reason=banned', request.url)
    return NextResponse.redirect(signinUrl)
  }

  // Not email verified
  if (!emailVerified) {
    if (isPathMatch(pathname, [...PROTECTED, ...ADMIN_ONLY, ...ONBOARDING])) {
      const otpUrl = new URL('/verify-otp', request.url)
      return NextResponse.redirect(otpUrl)
    }
    if (isPathMatch(pathname, AUTH_ROUTES)) {
      const otpUrl = new URL('/verify-otp', request.url)
      return NextResponse.redirect(otpUrl)
    }
    return response
  }

  // Email verified but profile incomplete
  if (emailVerified && !profileComplete) {
    if (isPathMatch(pathname, [...PROTECTED, ...ADMIN_ONLY])) {
      const onboardingUrl = new URL('/onboarding', request.url)
      return NextResponse.redirect(onboardingUrl)
    }
    if (isPathMatch(pathname, [...AUTH_ROUTES, ...OTP_GATE])) {
      const onboardingUrl = new URL('/onboarding', request.url)
      return NextResponse.redirect(onboardingUrl)
    }
    return response
  }

  // Fully verified
  if (emailVerified && profileComplete) {
    if (isPathMatch(pathname, [...AUTH_ROUTES, ...OTP_GATE, ...ONBOARDING])) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    if (isPathMatch(pathname, ADMIN_ONLY) && !isAdmin) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.).*)'],
}
