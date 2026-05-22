import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE() {
  const { user } = await requireAuth()
  if (!user) {
    return apiErr('Unauthorized', 401)
  }

  const { error } = await supabaseAdmin.from('notifications').delete().eq('user_id', user.id)

  if (error) {
    return apiErr('Failed to clear notifications', 500)
  }

  return apiOk({ cleared: true })
}
