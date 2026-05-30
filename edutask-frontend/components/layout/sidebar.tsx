'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  ClipboardList,
  MessageCircle,
  Wallet,
  Trophy,
  User,
  Shield,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tasks', href: '/tasks', icon: ListChecks },
  { label: 'Post Task', href: '/post-task', icon: PlusCircle },
  { label: 'My Tasks', href: '/my-tasks', icon: ClipboardList },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const isAdmin = user?.is_admin ?? false

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border bg-background z-40">
      <div className="p-6 flex items-center gap-2.5 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-[#4F46E5] flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">E</span>
        </div>
        <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[#F3F1EC]'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
              pathname.startsWith('/admin')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-[#F3F1EC]'
            )}
          >
            <Shield className="w-5 h-5" />
            Admin
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#F3F1EC] transition-colors duration-150 w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
        {user && (
          <div className="mt-4 flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {user.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">⭐ {user.trust_score}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
})
