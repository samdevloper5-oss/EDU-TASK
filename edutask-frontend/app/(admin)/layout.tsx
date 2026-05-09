import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Shield, Users, AlertTriangle, FileCheck, LayoutDashboard } from 'lucide-react'

const adminNav = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Disputes', href: '/admin/disputes', icon: AlertTriangle },
  { label: 'Verifications', href: '/admin/verifications', icon: FileCheck },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border bg-card z-40">
        <div className="p-6 flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Admin Panel</span>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/dashboard" className="text-sm text-primary hover:underline">← Back to Dashboard</Link>
        </div>
      </aside>
      <main className="md:ml-64 p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
