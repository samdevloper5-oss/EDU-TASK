import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, insertSystemMessage, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sanitizeText } from '@/lib/utils'
import { disputeSchema } from '@/lib/validations/task.schema'

const DISPUTABLE_STATUSES = ['in_progress', 'under_review'] as const

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

  const parsed = disputeSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, status')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)

  const isParticipant = user.id === task.poster_id || user.id === task.hired_worker_id
  if (!isParticipant) return apiErr('Only task participants can open a dispute', 403)

  if (!DISPUTABLE_STATUSES.includes(task.status as (typeof DISPUTABLE_STATUSES)[number])) {
    return apiErr('Disputes can only be opened for active tasks', 400)
  }

  const disputeReason = sanitizeText(parsed.data.reason)

  const { data: updatedTask, error } = await supabaseAdmin
    .from('tasks')
    .update({ status: 'disputed' })
    .eq('id', taskId)
    .in('status', [...DISPUTABLE_STATUSES])
    .select('*')
    .single()

  if (error || !updatedTask) {
    return apiErr('Failed to open dispute', 500)
  }

  const otherPartyId = user.id === task.poster_id ? task.hired_worker_id : task.poster_id

  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('is_admin', true)

  const filerLabel = user.id === task.poster_id ? 'Poster' : 'Worker'
  await Promise.all([
    insertSystemMessage(taskId, `Dispute opened by ${filerLabel}: ${disputeReason}`),
    otherPartyId
      ? createNotification({
          userId: otherPartyId,
          type: 'task_disputed',
          title: 'Dispute opened',
          message: `A dispute was opened on "${task.title}"`,
          link: `/chat/${taskId}`,
          referenceId: taskId,
          actorId: user.id,
        })
      : Promise.resolve(),
    createNotification({
      userId: user.id,
      type: 'task_disputed',
      title: 'Dispute filed',
      message: `Your dispute on "${task.title}" is under admin review`,
      link: `/chat/${taskId}`,
      referenceId: taskId,
    }),
    ...(admins ?? []).map((admin) =>
      createNotification({
        userId: admin.id,
        type: 'task_disputed',
        title: 'New dispute',
        message: `Dispute filed on "${task.title}" - review required`,
        link: '/admin/disputes',
        referenceId: taskId,
        actorId: user.id,
      })
    ),
  ])

  return apiOk(updatedTask, { status: 201 })
}
