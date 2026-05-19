import { PLATFORM_FEE_RATE, requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, insertSystemMessage, parseJsonBody, roundMoney } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { hireWorkerSchema } from '@/lib/validations/task.schema'

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

  const parsed = hireWorkerSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const workerId = parsed.data.worker_id

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, title, status, budget, task_type')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)
  if (task.poster_id !== user.id) return apiErr('Only the task poster can hire a worker', 403)
  if (task.status !== 'open') return apiErr('This task is not open for hiring', 400)

  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('id, status')
    .eq('task_id', taskId)
    .eq('worker_id', workerId)
    .eq('status', 'pending')
    .single()

  if (!application) return apiErr('Selected worker has no pending application', 400)

  const budget = roundMoney(Number(task.budget))

  const { data: poster } = await supabaseAdmin
    .from('users')
    .select('id, wallet_balance, escrow_balance, full_name')
    .eq('id', user.id)
    .single()

  if (!poster) return apiErr('Poster account not found', 500)

  if (Number(poster.wallet_balance) < budget) {
    return apiErr('Insufficient wallet balance. Add funds before hiring.', 400)
  }

  const newWalletBalance = roundMoney(Number(poster.wallet_balance) - budget)
  const newEscrowBalance = roundMoney(Number(poster.escrow_balance) + budget)

  const { error: walletError } = await supabaseAdmin
    .from('users')
    .update({
      wallet_balance: newWalletBalance,
      escrow_balance: newEscrowBalance,
    })
    .eq('id', user.id)

  if (walletError) return apiErr('Failed to lock escrow funds', 500)

  const { data: updatedTask, error: taskError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'in_progress',
      hired_worker_id: workerId,
      escrow_deposited: true,
    })
    .eq('id', taskId)
    .eq('status', 'open')
    .select('*')
    .single()

  if (taskError || !updatedTask) {
    await supabaseAdmin
      .from('users')
      .update({
        wallet_balance: poster.wallet_balance,
        escrow_balance: poster.escrow_balance,
      })
      .eq('id', user.id)
    return apiErr('Failed to update task', 500)
  }

  await supabaseAdmin
    .from('applications')
    .update({ status: 'accepted' })
    .eq('id', application.id)

  await supabaseAdmin
    .from('applications')
    .update({ status: 'rejected' })
    .eq('task_id', taskId)
    .eq('status', 'pending')
    .neq('worker_id', workerId)

  await supabaseAdmin.from('transactions').insert({
    user_id: user.id,
    type: 'escrow_lock',
    amount: budget,
    fee: 0,
    net_amount: -budget,
    method: 'wallet',
    status: 'completed',
    reference_id: taskId,
    counterparty_id: workerId,
    notes: `Escrow locked for task: ${task.title}`,
  })

  const workerPayout = roundMoney(budget * (1 - PLATFORM_FEE_RATE))
  await insertSystemMessage(
    taskId,
    `Worker hired. ৳${budget.toLocaleString()} moved to escrow. Worker will receive ৳${workerPayout.toLocaleString()} after completion (${(PLATFORM_FEE_RATE * 100).toFixed(0)}% platform fee).`
  )

  await createNotification({
    userId: workerId,
    type: 'task_hired',
    title: 'You were hired!',
    message: `You were hired for "${task.title}"`,
    link: `/chat/${taskId}`,
    referenceId: taskId,
    actorId: user.id,
  })

  await createNotification({
    userId: workerId,
    type: 'escrow_locked',
    title: 'Escrow locked',
    message: `৳${budget.toLocaleString()} is held in escrow for "${task.title}"`,
    link: `/chat/${taskId}`,
    referenceId: taskId,
    actorId: user.id,
  })

  await createNotification({
    userId: user.id,
    type: 'escrow_locked',
    title: 'Escrow deposited',
    message: `৳${budget.toLocaleString()} locked in escrow for "${task.title}"`,
    link: `/my-tasks`,
    referenceId: taskId,
  })

  return apiOk(updatedTask)
}
