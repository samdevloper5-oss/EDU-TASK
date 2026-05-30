import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
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
    .select('id, poster_id, title, budget, escrow_deposited')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
  if (!task.escrow_deposited) {
    return NextResponse.json({ success: false, error: 'Escrow not deposited' }, { status: 400 })
  }

  const budget = roundMoney(Number(task.budget))
  const { data: poster } = await supabaseAdmin
    .from('users')
    .select('id, wallet_balance, escrow_balance')
    .eq('id', task.poster_id)
    .single()

  if (!poster) {
    return NextResponse.json({ success: false, error: 'Poster not found' }, { status: 500 })
  }

  const posterWalletAfter = roundMoney(Number(poster.wallet_balance) + budget)
  const posterEscrowAfter = roundMoney(Number(poster.escrow_balance) - budget)

  await supabaseAdmin.from('users').update({
    wallet_balance: posterWalletAfter,
    escrow_balance: posterEscrowAfter,
  }).eq('id', task.poster_id)

  const { data: updatedTask, error: taskError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      escrow_deposited: false,
    })
    .eq('id', taskId)
    .select('*')
    .single()

  if (taskError || !updatedTask) {
    return NextResponse.json({ success: false, error: 'Failed to refund escrow' }, { status: 500 })
  }

  await Promise.all([
    supabaseAdmin.from('transactions').insert({
      user_id: task.poster_id,
      type: 'refund',
      amount: budget,
      fee: 0,
      net_amount: budget,
      method: 'wallet',
      status: 'completed',
      reference_id: taskId,
      notes: `Refund issued for: ${task.title}`,
    }),
    insertSystemMessage(taskId, `Admin refunded Tk ${budget.toLocaleString()} to poster.`),
    createNotification({
      userId: task.poster_id,
      type: 'task_resolved',
      title: 'Refund issued',
      message: `Tk ${budget.toLocaleString()} refunded to your wallet`,
      link: '/wallet',
      referenceId: taskId,
      actorId: adminUser.id,
    }),
  ])

  console.info(`[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=refund target=${taskId}`)

  return NextResponse.json({ success: true, data: updatedTask })
}
