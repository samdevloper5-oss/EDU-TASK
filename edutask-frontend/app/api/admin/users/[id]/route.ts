import { requireAdmin } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { adminBanSchema } from '@/lib/validations/task.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user: adminUser } = await requireAdmin()
  if (!isAdmin) return apiErr('Forbidden', 403)

  const { id: targetUserId } = await params

  if (adminUser?.id === targetUserId) {
    return apiErr('You cannot ban your own account', 400)
  }

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = adminBanSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, is_admin, full_name')
    .eq('id', targetUserId)
    .single()

  if (!target) return apiErr('User not found', 404)
  if (target.is_admin) return apiErr('Cannot ban an admin account', 400)

  const { is_banned, ban_reason } = parsed.data

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update({
      is_banned,
      ban_reason: is_banned ? ban_reason ?? 'Violation of platform rules' : null,
    })
    .eq('id', targetUserId)
    .select('id, email, full_name, is_banned, ban_reason')
    .single()

  if (error || !updated) {
    return apiErr('Failed to update user', 500)
  }

  await createNotification({
    userId: targetUserId,
    type: 'system',
    title: is_banned ? 'Account suspended' : 'Account reinstated',
    message: is_banned
      ? `Your account has been suspended. Reason: ${updated.ban_reason ?? 'Policy violation'}`
      : 'Your account suspension has been lifted. You can use EduTask again.',
    link: is_banned ? undefined : '/dashboard',
  })

  return apiOk(updated)
}
