import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parsePagination, paginationFrom } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { user } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)

  const { page, limit, from, to } = parsePagination(new URL(request.url).searchParams, {
    limit: 20,
  })

  const { data, error, count } = await supabaseAdmin
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return apiErr('Failed to load transactions', 500)

  return apiOk(data ?? [], {
    pagination: paginationFrom(page, limit, count ?? 0),
  })
}
