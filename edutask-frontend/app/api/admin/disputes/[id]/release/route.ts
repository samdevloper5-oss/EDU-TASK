import { NextResponse } from 'next/server'
import { PLATFORM_FEE_RATE, requireAdmin } from '@/lib/api-auth'
import { roundMoney, insertSystemMessage } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user: adminUser } = await requireAdmin()
  if (!isAdmin || !adminUser) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id: taskId } = await params
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, hired_worker_id, title, budget, escrow_deposited')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
  if (!task.hired_worker_id) {
    return NextResponse.json({ success: false, error: 'No worker assigned' }, { status: 400 })
  }
  if (!task.escrow_deposited) {
    return NextResponse.json({ success: false, error: 'Escrow not deposited' }, { status: 400 })
  }

  const budget = roundMoney(Number(task.budget))
  const platformFee = roundMoney(budget * PLATFORM_FEE_RATE)
  const workerPayout = roundMoney(budget - platformFee)

  const { data: poster } = await supabaseAdmin
    .from('users')
    .select('id, escrow_balance')
    .eq('id', task.poster_id)
    .single()

  const { data: worker } = await supabaseAdmin
    .from('users')
    .select('id, wallet_balance, total_earned')
    .eq('id', task.hired_worker_id)
    .single()

  if (!poster || !worker) {
    return NextResponse.json({ success: false, error: 'User accounts not found' }, { status: 500 })
  }

  const posterEscrowAfter = roundMoney(Number(poster.escrow_balance) - budget)
  const workerWalletAfter = roundMoney(Number(worker.wallet_balance) + workerPayout)
  const workerEarnedAfter = roundMoney(Number(worker.total_earned) + workerPayout)

  await supabaseAdmin.from('users').update({ escrow_balance: posterEscrowAfter }).eq('id', task.poster_id)
  await supabaseAdmin.from('users').update({
    wallet_balance: workerWalletAfter,
    total_earned: workerEarnedAfter,
  }).eq('id', task.hired_worker_id)

  const { data: updatedTask, error: taskError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      escrow_deposited: false,
    })
    .eq('id', taskId)
    .select('*')
    .single()

  if (taskError || !updatedTask) {
    return NextResponse.json({ success: false, error: 'Failed to release escrow' }, { status: 500 })
  }

  await Promise.all([
    supabaseAdmin.from('transactions').insert([
      {
        user_id: task.poster_id,
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
        counterparty_id: task.poster_id,
        notes: `Payment for: ${task.title}`,
      },
    ]),
    insertSystemMessage(taskId, `Admin released Tk ${workerPayout.toLocaleString()} to worker.`),
    createNotification({
      userId: task.hired_worker_id,
      type: 'escrow_released',
      title: 'Payment released',
      message: `Tk ${workerPayout.toLocaleString()} added to your wallet`,
      link: '/wallet',
      referenceId: taskId,
      actorId: adminUser.id,
    }),
  ])

  console.info(`[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=release target=${taskId}`)

  return NextResponse.json({ success: true, data: updatedTask })
}
