import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, insertSystemMessage, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sanitizeText } from '@/lib/utils'
import { revisionSchema } from '@/lib/validations/task.schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = revisionSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, status, revisions_used')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)
  if (task.poster_id !== user.id) return apiErr('Only the poster can request a revision', 403)
  if (task.status !== 'under_review') {
    return apiErr('Revisions can only be requested while work is under review', 400)
  }
  if (task.revisions_used >= 2) {
    return apiErr('Maximum of 2 revisions already used for this task', 400)
  }

  const revisionMessage = sanitizeText(parsed.data.message)
  const revisionsUsed = task.revisions_used + 1

  const { data: updatedTask, error } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'in_progress',
      revisions_used: revisionsUsed,
      submitted_at: null,
      auto_release_at: null,
    })
    .eq('id', taskId)
    .eq('status', 'under_review')
    .select('*')
    .single()

  if (error || !updatedTask) {
    return apiErr('Failed to request revision', 500)
  }

  await supabaseAdmin.from('messages').insert({
    task_id: taskId,
    sender_id: user.id,
    content: revisionMessage,
    message_type: 'text',
    is_system_message: false,
  })

  await insertSystemMessage(
    taskId,
    `Revision requested (${revisionsUsed}/2): ${revisionMessage}`
  )

  if (task.hired_worker_id) {
    await createNotification({
      userId: task.hired_worker_id,
      type: 'task_revision',
      title: 'Revision requested',
      message: `Poster requested a revision on "${task.title}" (${revisionsUsed}/2)`,
      link: `/chat/${taskId}`,
      referenceId: taskId,
      actorId: user.id,
    })
  }

  return apiOk(updatedTask)
}
