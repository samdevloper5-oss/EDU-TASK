import { requireAdmin } from '@/lib/api-auth'
import { apiErr, apiOk, roundMoney } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) return apiErr('Forbidden', 403)

  const [
    usersResult,
    tasksResult,
    openTasksResult,
    inProgressResult,
    disputedResult,
    completedResult,
    earningsResult,
    transactionsResult,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['in_progress', 'under_review', 'hired']),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('platform_earnings').select('amount'),
    supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'deposit')
      .eq('method', 'demo'),
  ])

  const totalPlatformEarnings = roundMoney(
    (earningsResult.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  )

  const { count: pendingVerifications } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('student_id_verified', false)
    .not('student_id_image_url', 'is', null)

  const { count: bannedUsers } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_banned', true)

  return apiOk({
    total_users: usersResult.count ?? 0,
    total_tasks: tasksResult.count ?? 0,
    open_tasks: openTasksResult.count ?? 0,
    active_tasks: inProgressResult.count ?? 0,
    disputed_tasks: disputedResult.count ?? 0,
    completed_tasks: completedResult.count ?? 0,
    pending_id_verifications: pendingVerifications ?? 0,
    banned_users: bannedUsers ?? 0,
    demo_deposits_count: transactionsResult.count ?? 0,
    total_platform_earnings: totalPlatformEarnings,
  })
}
