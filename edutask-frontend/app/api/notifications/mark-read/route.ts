import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Account suspended', 403)

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return apiErr('Failed to mark notifications as read', 500)

  return apiOk({ marked: true })
}
