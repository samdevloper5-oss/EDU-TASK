import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  FileCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

const adminNav = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Tasks', href: '/admin/tasks', icon: ListChecks },
  { label: 'Disputes', href: '/admin/disputes', icon: AlertTriangle },
  { label: 'Verifications', href: '/admin/verifications', icon: FileCheck },
  { label: 'Transactions', href: '/admin/transactions', icon: TrendingUp },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const isAdminEmail = user.email === 'admin@edutask.bd'
  let displayName = user.email ?? 'Admin'

  if (!isAdminEmail) {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, is_admin, is_banned')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin || profile.is_banned) redirect('/dashboard')
    if (profile.full_name) displayName = profile.full_name
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex">
      <aside className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 bg-white border-r border-[#E5E5E3] z-40">
        <div className="px-5 py-5 border-b border-[#E5E5E3]">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-[#4F46E5] flex items-center justify-center">
              <Shield className="size-3.5 text-white" />
            </div>
            <div>
              <p className="text-[#0F0F0F] text-sm font-bold tracking-tight">Admin Panel</p>
              <p className="text-[#A3A3A3] text-[10px]">EduTask</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-[#F4F4F2] transition-colors font-medium"
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#E5E5E3]">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-[#0F0F0F] truncate">{displayName}</p>
            <p className="text-[10px] text-[#A3A3A3]">Administrator</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6B6B6B] hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 md:ml-56 min-h-screen">
        <div className="px-6 py-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
