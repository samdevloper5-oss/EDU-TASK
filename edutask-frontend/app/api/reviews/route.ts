import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { sanitizeText } from '@/lib/utils'
import { reviewSchema } from '@/lib/validations/task.schema'

export async function POST(request: Request) {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = reviewSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const { task_id, reviewed_id, rating, comment } = parsed.data
  const sanitizedComment = sanitizeText(comment)

  if (reviewed_id === user.id) {
    return apiErr('You cannot review yourself', 400)
  }

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, status')
    .eq('id', task_id)
    .single()

  if (!task) return apiErr('Task not found', 404)
  if (task.status !== 'completed') {
    return apiErr('Reviews can only be left on completed tasks', 400)
  }

  const isParticipant =
    user.id === task.poster_id || user.id === task.hired_worker_id
  if (!isParticipant) return apiErr('You are not a participant on this task', 403)

  const validReviewee =
    reviewed_id === task.poster_id || reviewed_id === task.hired_worker_id
  if (!validReviewee) {
    return apiErr('You can only review the other party on this task', 400)
  }

  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('task_id', task_id)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existing) return apiErr('You have already reviewed this task', 409)

  const { data: review, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      task_id,
      reviewer_id: user.id,
      reviewed_id,
      rating,
      comment: sanitizedComment,
    })
    .select('*')
    .single()

  if (error || !review) {
    return apiErr('Failed to submit review', 500)
  }

  await createNotification({
    userId: reviewed_id,
    type: 'review_received',
    title: 'New review',
    message: `${profile?.full_name ?? 'Someone'} left a ${rating}-star review`,
    link: `/profile/${reviewed_id}`,
    referenceId: task_id,
    actorId: user.id,
  })

  return apiOk(review, { status: 201 })
}
