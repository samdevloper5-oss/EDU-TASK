import { supabaseAdmin } from '@/lib/supabase/admin'
import type { NotificationType } from '@/types'

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  referenceId,
  actorId,
}: {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  referenceId?: string
  actorId?: string
}) {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
    reference_id: referenceId ?? null,
    actor_id: actorId ?? null,
  })
}
