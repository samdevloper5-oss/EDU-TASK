import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import {
  Users,
  ListChecks,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Shield,
  MessageSquare,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const [
    { count: totalUsers },
    { count: activeTasks },
    { count: disputes },
    { count: pendingVerifications },
    { data: revenueData },
    { data: recentUsers },
    { data: recentDisputes },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { head: true, count: 'exact' }),
    supabaseAdmin
      .from('tasks')
      .select('*', { head: true, count: 'exact' })
      .in('status', ['open', 'hired', 'in_progress', 'under_review']),
    supabaseAdmin.from('tasks').select('*', { head: true, count: 'exact' }).eq('status', 'disputed'),
    supabaseAdmin
      .from('users')
      .select('*', { head: true, count: 'exact' })
      .eq('student_id_verified', false)
      .not('student_id_image_url', 'is', null),
    supabaseAdmin.from('transactions').select('net_amount').eq('type', 'platform_fee').eq('status', 'completed'),
    supabaseAdmin
      .from('users')
      .select('id, full_name, email, created_at, trust_score, is_banned')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('tasks')
      .select('id, title, poster:users!tasks_poster_id_fkey(full_name), created_at')
      .eq('status', 'disputed')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalRevenue = (revenueData ?? []).reduce((sum, tx) => sum + (Number(tx.net_amount) || 0), 0)
  const users = (recentUsers ?? []) as Array<{
    id: string
    full_name: string | null
    email: string
    is_banned: boolean
  }>
  const disputesList = (recentDisputes ?? []) as Array<{
    id: string
    title: string
    created_at: string
    poster: { full_name?: string } | null
  }>

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, sub: 'all accounts', icon: Users, href: '/admin/users' },
    { label: 'Active Tasks', value: activeTasks ?? 0, sub: 'open + in flight', icon: ListChecks, href: '/admin/tasks' },
    { label: 'Open Disputes', value: disputes ?? 0, sub: 'needs review', icon: AlertTriangle, href: '/admin/disputes' },
    { label: 'ID Verifications', value: pendingVerifications ?? 0, sub: 'pending review', icon: FileCheck, href: '/admin/verifications' },
    { label: 'Platform Revenue', value: `৳${totalRevenue.toLocaleString()}`, sub: 'all time', icon: TrendingUp, href: '/admin/transactions' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Overview</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">Platform health at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-5 hover:border-[#4F46E5]/30 transition-colors">
              <stat.icon className="size-4 text-[#4F46E5] mb-3" />
              <p className="text-2xl font-bold text-[#0F0F0F] tracking-tight">{stat.value}</p>
              <p className="text-sm font-medium text-[#0F0F0F] mt-0.5">{stat.label}</p>
              <p className="text-xs text-[#A3A3A3] mt-0.5">{stat.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Users</h2>
            <Link href="/admin/users" className="text-xs text-[#4F46E5] hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F0F0F] truncate">
                    {user.full_name ?? user.email}
                  </p>
                  <p className="text-xs text-[#A3A3A3] truncate">{user.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded font-medium ${user.is_banned ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {user.is_banned ? 'Banned' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Open Disputes</h2>
            <Link href="/admin/disputes" className="text-xs text-[#4F46E5] hover:underline">
              Resolve
            </Link>
          </div>
          {(recentDisputes ?? []).length === 0 ? (
            <p className="text-sm text-[#A3A3A3] py-6 text-center">No open disputes</p>
          ) : (
            <div className="space-y-3">
              {disputesList.map((task) => (
                <Link key={task.id} href={`/admin/disputes/${task.id}`} className="block group">
                  <p className="text-sm font-medium text-[#0F0F0F] group-hover:text-[#4F46E5] transition-colors truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-[#A3A3A3]">
                    {(task as any).poster?.full_name ?? 'Unknown'} · {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
