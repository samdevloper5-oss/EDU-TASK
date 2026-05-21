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
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border bg-card z-40">
      <div className="p-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">E</span>
        </div>
        <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
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
