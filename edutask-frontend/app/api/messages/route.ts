import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody, parsePagination, paginationFrom } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sanitizeText } from '@/lib/utils'
import { sendMessageSchema } from '@/lib/validations/task.schema'

const SENDER_FIELDS = 'id, full_name, profile_photo_url'

export async function GET(request: Request) {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)

  const taskId = new URL(request.url).searchParams.get('task_id')
  if (!taskId) return apiErr('task_id query parameter is required', 400)

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)

  const isParticipant =
    user.id === task.poster_id ||
    user.id === task.hired_worker_id ||
    profile?.is_admin === true

  if (!isParticipant) return apiErr('You do not have access to this conversation', 403)

  const { page, limit, from, to } = parsePagination(new URL(request.url).searchParams, {
    limit: 50,
  })

  const { data, error, count } = await supabaseAdmin
    .from('messages')
    .select(`*, sender:users!messages_sender_id_fkey(${SENDER_FIELDS})`, { count: 'exact' })
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (error) return apiErr('Failed to load messages', 500)

  return apiOk(data ?? [], {
    pagination: paginationFrom(page, limit, count ?? 0),
  })
}

export async function POST(request: Request) {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = sendMessageSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { task_id: taskId, file_url, file_name } = parsed.data
  const content = sanitizeText(parsed.data.content)

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, status')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)

  const isParticipant = user.id === task.poster_id || user.id === task.hired_worker_id
  if (!isParticipant) return apiErr('You are not a participant in this task', 403)

  if (task.status === 'completed' || task.status === 'cancelled') {
    return apiErr('Cannot send messages on a closed task', 400)
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      task_id: taskId,
      sender_id: user.id,
      content,
      message_type: file_url ? 'file' : 'text',
      file_url: file_url ?? null,
      file_name: file_name ? sanitizeText(file_name) : null,
      is_system_message: false,
      read_by: [user.id],
    })
    .select(`*, sender:users!messages_sender_id_fkey(${SENDER_FIELDS})`)
    .single()

  if (error || !message) return apiErr('Failed to send message', 500)

  const recipientId =
    user.id === task.poster_id ? task.hired_worker_id : task.poster_id

  if (recipientId) {
    await createNotification({
      userId: recipientId,
      type: 'message',
      title: 'New message',
      message: `${profile?.full_name ?? 'Someone'} sent a message on "${task.title}"`,
      link: `/chat/${taskId}`,
      referenceId: taskId,
      actorId: user.id,
    })
  }

  return apiOk(message, { status: 201 })
}
