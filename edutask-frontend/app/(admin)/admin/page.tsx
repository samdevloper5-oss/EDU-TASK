import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import {
  Users, ListChecks, AlertTriangle, FileCheck,
  TrendingUp, DollarSign, Shield, MessageSquare,
} from 'lucide-react'

export default async function AdminOverviewPage() {
  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: bannedUsers },
    { count: openTasks },
    { count: activeTasks },
    { count: completedTasks },
    { count: disputes },
    { count: pendingVerifications },
    { data: revenueData },
    { data: recentUsers },
    { data: recentDisputes },
    { data: recentTransactions },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { head: true, count: 'exact' }),
    supabaseAdmin.from('users').select('*', { head: true, count: 'exact' }).eq('is_banned', false),
    supabaseAdmin.from('users').select('*', { head: true, count: 'exact' }).eq('is_banned', true),
    supabaseAdmin.from('tasks').select('*', { head: true, count: 'exact' }).eq('status', 'open'),
    supabaseAdmin.from('tasks').select('*', { head: true, count: 'exact' }).in('status', ['hired', 'in_progress', 'under_review']),
    supabaseAdmin.from('tasks').select('*', { head: true, count: 'exact' }).eq('status', 'completed'),
    supabaseAdmin.from('tasks').select('*', { head: true, count: 'exact' }).eq('status', 'disputed'),
    supabaseAdmin.from('users').select('*', { head: true, count: 'exact' }).eq('student_id_verified', false).not('student_id_image_url', 'is', null),
    supabaseAdmin.from('transactions').select('net_amount').eq('type', 'platform_fee').eq('status', 'completed'),
    supabaseAdmin.from('users').select('id, full_name, email, created_at, trust_score, is_banned').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('tasks').select('id, title, poster:users!tasks_poster_id_fkey(full_name), created_at').eq('status', 'disputed').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('transactions').select('id, type, amount, net_amount, status, created_at, user:users!transactions_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(8),
  ])

  const totalRevenue = (revenueData ?? []).reduce((sum, tx) => sum + (Number(tx.net_amount) || 0), 0)

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, sub: `${bannedUsers ?? 0} banned`, icon: Users, href: '/admin/users', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Tasks', value: activeTasks ?? 0, sub: `${openTasks ?? 0} open`, icon: ListChecks, href: '/admin/tasks', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Completed', value: completedTasks ?? 0, sub: 'lifetime', icon: Shield, href: '/admin/tasks?status=completed', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Disputes', value: disputes ?? 0, sub: 'needs review', icon: AlertTriangle, href: '/admin/disputes', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Verifications', value: pendingVerifications ?? 0, sub: 'pending review', icon: FileCheck, href: '/admin/verifications', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Revenue', value: `৳${totalRevenue.toLocaleString()}`, sub: 'all time', icon: TrendingUp, href: '/admin/transactions', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform health at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors group">
              <div className={`size-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-foreground">New Users</h2>
            <Link href="/admin/users" className="text-xs text-primary hover:underline">See all</Link>
          </div>
          <div className="space-y-3">
            {(recentUsers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No users yet</p>
            ) : (
              (recentUsers ?? []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name ?? u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${u.is_banned ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                    {u.is_banned ? 'Banned' : 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-foreground">Open Disputes</h2>
            <Link href="/admin/disputes" className="text-xs text-primary hover:underline">Resolve</Link>
          </div>
          {(recentDisputes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No open disputes</p>
          ) : (
            <div className="space-y-3">
              {(recentDisputes ?? []).map((d: any) => (
                <Link key={d.id} href={`/admin/disputes/${d.id}`} className="block group">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.poster?.full_name ?? 'Unknown'} · {new Date(d.created_at).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-foreground">Recent Transactions</h2>
            <Link href="/admin/transactions" className="text-xs text-primary hover:underline">See all</Link>
          </div>
          <div className="space-y-2.5">
            {(recentTransactions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            ) : (
              (recentTransactions ?? []).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground capitalize">{tx.type.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{tx.user?.full_name ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${Number(tx.net_amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {Number(tx.net_amount) >= 0 ? '+' : ''}৳{Math.abs(Number(tx.net_amount)).toLocaleString()}
                    </p>
                    <p className={`text-[10px] ${tx.status === 'completed' ? 'text-success' : 'text-warning'}`}>{tx.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
