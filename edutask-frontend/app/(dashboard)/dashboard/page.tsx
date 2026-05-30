import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import { ArrowRight, Clock, Shield, Star, Wallet, TrendingUp, CheckCircle2, ArrowUpRight } from 'lucide-react'

const cardGradients = [
  { bg: 'bg-gradient-to-br from-primary/10 to-indigo-50', iconColor: 'text-primary' },
  { bg: 'bg-gradient-to-br from-amber-50 to-orange-50', iconColor: 'text-amber-600' },
  { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', iconColor: 'text-emerald-600' },
  { bg: 'bg-gradient-to-br from-sky-50 to-blue-50', iconColor: 'text-sky-600' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('users').select('*').eq('id', user!.id).single()
  if (profile?.is_admin) redirect('/admin')

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
    { label: 'Wallet balance', value: `${Number(profile?.wallet_balance ?? 0).toLocaleString()} BDT`, icon: Wallet, sub: 'Available to withdraw' },
    { label: 'Escrow', value: `${Number(profile?.escrow_balance ?? 0).toLocaleString()} BDT`, icon: Shield, sub: 'Locked for active tasks' },
    { label: 'Completed', value: `${profile?.completed_tasks ?? 0}`, icon: Star, sub: 'Tasks completed' },
    { label: 'Trust score', value: `${profile?.trust_score ?? 0}`, icon: Clock, sub: 'Based on reviews' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Student'}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s what&apos;s happening with your tasks today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <Card
            key={stat.label}
            className={`p-5 border-border ${cardGradients[i].bg} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="size-11 rounded-2xl bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <stat.icon className={`size-5 ${cardGradients[i].iconColor}`} />
              </div>
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/post-task"
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
        >
          Post a Task
        </Link>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-all"
        >
          Browse tasks <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Available Tasks */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Available Tasks</h3>
              <Link href="/tasks" className="text-xs text-primary hover:underline font-medium">
                View All
              </Link>
            </div>
            <div className="divide-y divide-border">
              {(tasks ?? []).length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No tasks available right now</div>
              )}
              {(tasks ?? []).map((task: any) => {
                const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-5 hover:bg-muted/30 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600 flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <span className="text-xs font-bold uppercase">{task.category?.[0] ?? 'T'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.poster?.full_name ?? 'Unknown'} &middot; {task.poster?.university_name ?? ''}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className={`text-xs ${daysLeft > 3 ? 'text-emerald-600' : daysLeft > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                      </span>
                      <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary/10 to-indigo-50 text-primary">
                        ৳{task.budget?.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Activity */}
        <div>
          <Card className="border-border bg-card">
            <div className="p-5 border-b border-border">
              <h3 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Recent Activity</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-indigo-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="size-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600">Total Balance</span>
                </div>
                <p className="text-xl font-bold text-foreground"> ৳{Number(profile?.wallet_balance ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Available for withdrawal</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-600">In Escrow</span>
                </div>
                <p className="text-xl font-bold text-foreground"> ৳{Number(profile?.escrow_balance ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Locked for active tasks</p>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Transactions</p>
                {(transactions ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">No recent activity</p>
                )}
                {(transactions ?? []).slice(0, 3).map((tx: any) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="size-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate capitalize">{tx.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className={`text-sm font-bold ${tx.net_amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.net_amount >= 0 ? '+' : '-'} ৳{Math.abs(tx.net_amount).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
