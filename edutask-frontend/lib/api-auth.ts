export const PLATFORM_FEE_RATE = 0.08

export async function requireAuth() {
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { supabase, user: null as null, profile: null as null }

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  return { supabase, user, profile }
}

export async function requireAdmin() {
  const auth = await requireAuth()
  if (!auth.user) return { ...auth, isAdmin: false }
  if (auth.user.email === 'admin@edutask.bd') return { ...auth, isAdmin: true, profile: auth.profile ?? null }
  if (!auth.profile?.is_admin) return { ...auth, isAdmin: false }
  return { ...auth, isAdmin: true }
}
