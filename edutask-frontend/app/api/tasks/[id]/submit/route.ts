import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, insertSystemMessage, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sanitizeText } from '@/lib/utils'
import { submitWorkSchema } from '@/lib/validations/task.schema'

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

  const parsed = submitWorkSchema.safeParse(parsedBody.body ?? {})
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, status')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)
  if (task.hired_worker_id !== user.id) return apiErr('Only the hired worker can submit work', 403)
  if (task.status !== 'in_progress') {
    return apiErr('Work can only be submitted while the task is in progress', 400)
  }

  const submittedAt = new Date().toISOString()
  const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data: updatedTask, error } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'under_review',
      submitted_at: submittedAt,
      auto_release_at: autoReleaseAt,
    })
    .eq('id', taskId)
    .eq('status', 'in_progress')
    .select('*')
    .single()

  if (error || !updatedTask) {
    return apiErr('Failed to submit work', 500)
  }

  const submissionMessage = parsed.data.message
    ? sanitizeText(parsed.data.message)
    : 'Work submitted'

  if (parsed.data.message || parsed.data.file_url) {
    await supabaseAdmin.from('messages').insert({
      task_id: taskId,
      sender_id: user.id,
      content: submissionMessage,
      message_type: parsed.data.file_url ? 'file' : 'text',
      file_url: parsed.data.file_url ?? null,
      file_name: parsed.data.file_name ? sanitizeText(parsed.data.file_name) : null,
      is_system_message: false,
    })
  }

  await insertSystemMessage(
    taskId,
    'Work submitted for review. The poster has 72 hours to accept or request a revision.'
  )

  await createNotification({
    userId: task.poster_id,
    type: 'task_submitted',
    title: 'Work submitted',
    message: `Work was submitted for "${task.title}"`,
    link: `/chat/${taskId}`,
    referenceId: taskId,
    actorId: user.id,
  })

  return apiOk(updatedTask)
}
