import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parsePagination, paginationFrom } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { user } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)

  const { page, limit, from, to } = parsePagination(new URL(request.url).searchParams, {
    limit: 30,
  })
  const unreadOnly = new URL(request.url).searchParams.get('unread') === 'true'

  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error, count } = await query
  if (error) return apiErr('Failed to load notifications', 500)

  const { count: unreadCount } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return apiOk(
    { notifications: data ?? [], unread_count: unreadCount ?? 0 },
    { pagination: paginationFrom(page, limit, count ?? 0) }
  )
}

export async function PATCH() {
  const { user } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return apiErr('Failed to mark notifications as read', 500)

  return apiOk({ marked_all_read: true })
}
