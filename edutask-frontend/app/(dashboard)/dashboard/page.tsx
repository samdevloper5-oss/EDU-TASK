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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Student'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg bg-[#F3F1EC] flex items-center justify-center">
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-5 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xs text-subtle-text">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/post-task"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
        >
          Post task
        </Link>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-[#F3F1EC]"
        >
          Browse tasks <ArrowRight className="size-4" />
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Available tasks</h2>
          <Link href="/tasks" className="text-xs text-primary hover:underline">
            See all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(tasks ?? []).map((task: any) => {
            const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)

            return (
              <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                <Card className="h-full p-5 transition-colors hover:border-primary/30">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="rounded-md bg-[#F3F1EC] px-2.5 py-1 text-xs font-semibold text-primary">
                      {task.category}
                    </span>
                    <span className="text-xs text-subtle-text">
                      {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {task.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <span className="max-w-[88px] truncate text-xs text-muted-foreground">
                        {task.poster?.full_name ?? 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground">৳{task.budget?.toLocaleString()}</p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <Card className="divide-y divide-border overflow-hidden">
          {(transactions ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-subtle-text">No transactions yet</div>
          )}
          {(transactions ?? []).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{tx.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-subtle-text">{new Date(tx.created_at).toLocaleDateString()}</p>
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
