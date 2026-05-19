import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sanitizeText } from '@/lib/utils'
import { applyTaskSchema } from '@/lib/validations/task.schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)
  if (!profile?.profile_complete) {
    return apiErr('Complete your profile before applying', 403)
  }

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = applyTaskSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, title, status')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)
  if (task.status !== 'open') return apiErr('This task is no longer accepting applications', 400)
  if (task.poster_id === user.id) return apiErr('You cannot apply to your own task', 400)

  const { data: existing } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('task_id', taskId)
    .eq('worker_id', user.id)
    .maybeSingle()

  if (existing) return apiErr('You have already applied to this task', 409)

  const proposal = sanitizeText(parsed.data.proposal)

  const { data: application, error } = await supabaseAdmin
    .from('applications')
    .insert({
      task_id: taskId,
      worker_id: user.id,
      proposal,
      estimated_hours: parsed.data.estimated_hours ?? null,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error || !application) {
    return apiErr('Failed to submit application', 500)
  }

  await createNotification({
    userId: task.poster_id,
    type: 'task_applied',
    title: 'New application',
    message: `${profile?.full_name ?? 'A student'} applied to "${task.title}"`,
    link: `/tasks/${taskId}`,
    referenceId: taskId,
    actorId: user.id,
  })

  return apiOk(application, { status: 201 })
}
