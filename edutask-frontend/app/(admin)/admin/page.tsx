import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Users, ListChecks, AlertTriangle, FileCheck, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const [{ count: userCount }, { count: activeTasks }, { count: pendingDisputes }, { count: pendingVerifications }, { data: revenue }] = await Promise.all([
    supabase.from('users').select('*', { head: true, count: 'exact' }),
    supabase.from('tasks').select('*', { head: true, count: 'exact' }).in('status', ['open', 'hired', 'in_progress', 'under_review']),
    supabase.from('tasks').select('*', { head: true, count: 'exact' }).eq('status', 'disputed'),
    supabase.from('users').select('*', { head: true, count: 'exact' }).eq('student_id_verified', false).not('student_id_image_url', 'is', null),
    supabase.from('transactions').select('amount').eq('type', 'platform_fee').eq('status', 'completed'),
  ])

  const totalRevenue = (revenue ?? []).reduce((sum, tx) => sum + (tx.amount ?? 0), 0)

  const stats = [
    { label: 'Total Users', value: userCount ?? 0, icon: Users, href: '/admin/users' },
    { label: 'Active Tasks', value: activeTasks ?? 0, icon: ListChecks, href: '/admin/tasks' },
    { label: 'Pending Disputes', value: pendingDisputes ?? 0, icon: AlertTriangle, href: '/admin/disputes' },
    { label: 'ID Verifications', value: pendingVerifications ?? 0, icon: FileCheck, href: '/admin/verifications' },
    { label: 'Platform Revenue', value: `${totalRevenue.toLocaleString()}৳`, icon: TrendingUp, href: '#' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Admin Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 border-border hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-bold mt-8" style={{ fontFamily: 'var(--font-heading)' }}>Recent Disputes</h2>
      <Card className="p-6 border-border text-center text-muted-foreground">
        View the <Link href="/admin/disputes" className="text-primary hover:underline">disputes page</Link> to manage active disputes.
      </Card>

      <h2 className="text-lg font-bold mt-8" style={{ fontFamily: 'var(--font-heading)' }}>Pending Verifications</h2>
      <Card className="p-6 border-border text-center text-muted-foreground">
        View the <Link href="/admin/verifications" className="text-primary hover:underline">verifications page</Link> to review student IDs.
      </Card>
    </div>
  )
}
