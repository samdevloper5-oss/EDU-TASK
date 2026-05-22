import { PLATFORM_FEE_RATE, requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, insertSystemMessage, roundMoney } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, status, budget, escrow_deposited')
    .eq('id', taskId)
    .single()

  if (!task) return apiErr('Task not found', 404)
  if (task.poster_id !== user.id) return apiErr('Only the poster can accept work', 403)
  if (task.status !== 'under_review') return apiErr('Task is not awaiting review', 400)
  if (!task.hired_worker_id) return apiErr('No worker assigned to this task', 400)
  if (!task.escrow_deposited) return apiErr('Escrow has not been deposited for this task', 400)

  const budget = roundMoney(Number(task.budget))
  const platformFee = roundMoney(budget * PLATFORM_FEE_RATE)
  const workerPayout = roundMoney(budget - platformFee)

  if (workerPayout < 100) {
    return apiErr('Payout after platform fee must be at least Tk 100', 400)
  }

  const { data: poster } = await supabaseAdmin
    .from('users')
    .select('id, escrow_balance')
    .eq('id', user.id)
    .single()

  const { data: worker } = await supabaseAdmin
    .from('users')
    .select('id, wallet_balance, total_earned')
    .eq('id', task.hired_worker_id)
    .single()

  if (!poster || !worker) return apiErr('User accounts not found', 500)

  if (Number(poster.escrow_balance) < budget) {
    return apiErr('Insufficient escrow balance', 400)
  }

  const posterEscrowAfter = roundMoney(Number(poster.escrow_balance) - budget)
  const workerWalletAfter = roundMoney(Number(worker.wallet_balance) + workerPayout)
  const workerEarnedAfter = roundMoney(Number(worker.total_earned) + workerPayout)

  const { error: posterError } = await supabaseAdmin
    .from('users')
    .update({ escrow_balance: posterEscrowAfter })
    .eq('id', user.id)

  if (posterError) return apiErr('Failed to release escrow', 500)

  const { error: workerError } = await supabaseAdmin
    .from('users')
    .update({
      wallet_balance: workerWalletAfter,
      total_earned: workerEarnedAfter,
    })
    .eq('id', task.hired_worker_id)

  if (workerError) {
    await supabaseAdmin
      .from('users')
      .update({ escrow_balance: poster.escrow_balance })
      .eq('id', user.id)
    return apiErr('Failed to pay worker', 500)
  }

  const completedAt = new Date().toISOString()
  const { data: updatedTask, error: taskError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: completedAt,
      escrow_deposited: false,
    })
    .eq('id', taskId)
    .eq('status', 'under_review')
    .select('*')
    .single()

  if (taskError || !updatedTask) {
    await supabaseAdmin
      .from('users')
      .update({ escrow_balance: poster.escrow_balance })
      .eq('id', user.id)
    await supabaseAdmin
      .from('users')
      .update({
        wallet_balance: worker.wallet_balance,
        total_earned: worker.total_earned,
      })
      .eq('id', task.hired_worker_id)
    return apiErr('Failed to complete task', 500)
  }

  await Promise.all([
    supabaseAdmin.from('transactions').insert([
      {
        user_id: user.id,
        type: 'escrow_release',
        amount: budget,
        fee: 0,
        net_amount: -budget,
        method: 'wallet',
        status: 'completed',
        reference_id: taskId,
        counterparty_id: task.hired_worker_id,
        notes: `Escrow released for: ${task.title}`,
      },
      {
        user_id: task.hired_worker_id,
        type: 'earning',
        amount: budget,
        fee: platformFee,
        net_amount: workerPayout,
        method: 'wallet',
        status: 'completed',
        reference_id: taskId,
        counterparty_id: user.id,
        notes: `Payment for: ${task.title}`,
      },
    ]),
    supabaseAdmin.from('platform_earnings').insert({
      task_id: taskId,
      amount: platformFee,
      task_budget: budget,
      fee_rate: PLATFORM_FEE_RATE,
    }),
    insertSystemMessage(
      taskId,
      `Work accepted. Tk ${workerPayout.toLocaleString()} released to worker (Tk ${platformFee.toLocaleString()} platform fee).`
    ),
    createNotification({
      userId: task.hired_worker_id,
      type: 'task_accepted',
      title: 'Work accepted',
      message: `You earned Tk ${workerPayout.toLocaleString()} for "${task.title}"`,
      link: '/wallet',
      referenceId: taskId,
      actorId: user.id,
    }),
    createNotification({
      userId: task.hired_worker_id,
      type: 'escrow_released',
      title: 'Payment received',
      message: `Tk ${workerPayout.toLocaleString()} added to your wallet`,
      link: '/wallet',
      referenceId: taskId,
      actorId: user.id,
    }),
    createNotification({
      userId: user.id,
      type: 'task_accepted',
      title: 'Task completed',
      message: `"${task.title}" marked as completed`,
      link: `/tasks/${taskId}`,
      referenceId: taskId,
    }),
  ])

  const { error: cleanupError } = await supabaseAdmin
    .from('messages')
    .delete()
    .eq('task_id', taskId)
    .eq('is_system_message', false)
    .eq('flagged', false)

  if (cleanupError) {
    console.error('Message cleanup failed (non-fatal):', cleanupError.message)
  }

  return apiOk({
    task: updatedTask,
    worker_payout: workerPayout,
    platform_fee: platformFee,
  })
}
