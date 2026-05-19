import { requireAdmin } from '@/lib/api-auth'
import { apiErr, apiOk, parsePagination, paginationFrom } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'

const USER_LIST_FIELDS =
  'id, email, full_name, university_name, trust_score, wallet_balance, is_banned, is_admin, student_id_verified, profile_complete, created_at, last_active_at'

export async function GET(request: Request) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) return apiErr('Forbidden', 403)

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const banned = searchParams.get('banned')
  const { page, limit, from, to } = parsePagination(searchParams, { limit: 25 })

  let query = supabaseAdmin
    .from('users')
    .select(USER_LIST_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,university_name.ilike.%${search}%`
    )
  }
  if (banned === 'true') {
    query = query.eq('is_banned', true)
  } else if (banned === 'false') {
    query = query.eq('is_banned', false)
  }

  const { data, error, count } = await query
  if (error) return apiErr('Failed to load users', 500)

  return apiOk(data ?? [], {
    pagination: paginationFrom(page, limit, count ?? 0),
  })
}
