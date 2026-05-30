import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Admin routes — strict auth + role check
  if (pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/signin'
      return NextResponse.redirect(url)
    }

    // Admin by email — no DB query needed
    if (user.email === 'admin@edutask.bd') return supabaseResponse

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin, is_banned')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin || profile.is_banned) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // Skip auth checks for signout — let route handler clear cookies
  if (pathname === '/api/auth/signout') {
    return supabaseResponse
  }

  // Protected routes
  const protectedPaths = [
    '/dashboard',
    '/tasks',
    '/post-task',
    '/my-tasks',
    '/chat',
    '/leaderboard',
    '/wallet',
    '/profile',
    '/onboarding',
  ]

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!user && isProtected) {
    url.pathname = '/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Auth pages — redirect authenticated users
  if (user && (pathname === '/signin' || pathname === '/signup' || pathname === '/forgot-password')) {
    url.pathname = user.email === 'admin@edutask.bd' ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
