import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Wallet, ShieldCheck, CheckCircle, Star, ArrowRight, TrendingUp, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Student'}!
        </h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 overflow-hidden relative">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{(profile?.wallet_balance ?? 0).toLocaleString()}৳</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Wallet Balance</p>
        </Card>
        <Card className="p-5 border-border rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 overflow-hidden relative">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold">{(profile?.escrow_balance ?? 0).toLocaleString()}৳</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">In Escrow</p>
        </Card>
        <Card className="p-5 border-border rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 overflow-hidden relative">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{profile?.completed_tasks ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Completed</p>
        </Card>
        <Card className="p-5 border-border rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 overflow-hidden relative">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-2xl font-bold">{profile?.trust_score ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Trust Score</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/post-task">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20">
            📝 Post Task
          </Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">🔍 Browse Tasks</Button>
        </Link>
        <Link href="/wallet">
          <Button variant="outline">💸 Withdraw</Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Available Tasks</h2>
          <Link href="/tasks" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(tasks ?? []).map((task: any) => {
            const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className="p-5 border-border hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all cursor-pointer h-full bg-card rounded-2xl group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{task.category}</span>
                    <span className={`text-xs flex items-center gap-1 ${daysLeft < 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{task.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold overflow-hidden">
                        {task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">{task.poster?.full_name ?? 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{task.budget?.toLocaleString()}৳</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Recent Activity</h2>
        <Card className="border-border divide-y divide-border">
          {(transactions ?? []).length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">No transactions yet</div>
          )}
          {(transactions ?? []).map((tx: any) => (
            <div key={tx.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tx.type === 'deposit' || tx.type === 'earning' ? 'bg-emerald-500/10 text-emerald-500' :
                  tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${
                tx.type === 'deposit' || tx.type === 'earning' ? 'text-emerald-500' :
                tx.type === 'withdrawal' ? 'text-red-500' : 'text-foreground'
              }`}>
                {tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-'}{tx.amount.toLocaleString()}৳
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
