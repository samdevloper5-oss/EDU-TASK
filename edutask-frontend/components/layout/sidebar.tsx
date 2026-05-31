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
  ChevronLeft,
  ChevronRight,
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
      <div className="p-5 flex items-center gap-2.5 border-b border-border">
        <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-primary-foreground font-bold text-sm">E</span>
        </div>
        <span className="font-bold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              pathname.startsWith('/admin')
                ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Shield className="size-[18px]" />
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
          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary font-bold text-xs shadow-sm">
              {user.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">⭐ {user.trust_score}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
})
