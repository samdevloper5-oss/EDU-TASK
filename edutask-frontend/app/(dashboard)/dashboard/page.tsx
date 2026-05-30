import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import { ArrowRight, Clock, Shield, Star, Wallet } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('users').select('*').eq('id', user!.id).single()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, poster:users!tasks_poster_id_fkey(full_name, university_name, trust_score)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(4)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const statCards = [
    { label: 'Wallet balance', value: `${Number(profile?.wallet_balance ?? 0).toLocaleString()}৳`, icon: Wallet, sub: 'Available to withdraw' },
    { label: 'Escrow', value: `${Number(profile?.escrow_balance ?? 0).toLocaleString()}৳`, icon: Shield, sub: 'Locked for active tasks' },
    { label: 'Completed', value: `${profile?.completed_tasks ?? 0}`, icon: Star, sub: 'Tasks completed' },
    { label: 'Trust score', value: `${profile?.trust_score ?? 0}`, icon: Clock, sub: 'Based on reviews' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-label mb-2">Dashboard</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Student'}
        </h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg bg-[#F4F4F2] flex items-center justify-center">
                <stat.icon className="size-4 text-[#6B6B6B]" />
              </div>
            </div>
            <p className="mt-5 text-2xl font-bold text-[#0F0F0F] tracking-tight">{stat.value}</p>
            <p className="mt-1 text-sm text-[#6B6B6B]">{stat.label}</p>
            <p className="mt-1 text-xs text-[#A3A3A3]">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/post-task"
          className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4338CA]"
        >
          Post task
        </Link>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E3] bg-white px-4 py-2.5 text-sm font-medium text-[#0F0F0F] hover:bg-[#F4F4F2]"
        >
          Browse tasks <ArrowRight className="size-4" />
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Available tasks</h2>
          <Link href="/tasks" className="text-xs text-[#4F46E5] hover:underline">
            See all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(tasks ?? []).map((task: any) => {
            const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)

            return (
              <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                <Card className="h-full p-5 transition-colors hover:border-[#4F46E5]/30">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="rounded-md bg-[#F4F4F2] px-2.5 py-1 text-xs font-semibold text-[#4F46E5]">
                      {task.category}
                    </span>
                    <span className="text-xs text-[#A3A3A3]">
                      {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#0F0F0F]">
                    {task.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs text-[#6B6B6B]">{task.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#E5E5E3] pt-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 overflow-hidden rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-[10px] font-bold text-[#4F46E5]">
                        {task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <span className="max-w-[88px] truncate text-xs text-[#6B6B6B]">
                        {task.poster?.full_name ?? 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#0F0F0F]">৳{task.budget?.toLocaleString()}</p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[#0F0F0F]">Recent activity</h2>
        <Card className="divide-y divide-[#E5E5E3] overflow-hidden">
          {(transactions ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-[#A3A3A3]">No transactions yet</div>
          )}
          {(transactions ?? []).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-[#0F0F0F] capitalize">{tx.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[#A3A3A3]">{new Date(tx.created_at).toLocaleDateString()}</p>
              </div>
              <p className={`text-sm font-bold ${tx.net_amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {tx.net_amount >= 0 ? '+' : '-'}৳{Math.abs(tx.net_amount).toLocaleString()}
              </p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  )
}
