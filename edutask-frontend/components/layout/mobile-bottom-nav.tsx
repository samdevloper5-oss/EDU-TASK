'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListChecks, PlusCircle, Wallet, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Home',        href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Tasks',       href: '/tasks',         icon: ListChecks },
  { label: 'Post',        href: '/post-task',     icon: PlusCircle, highlight: true },
  { label: 'Wallet',      href: '/wallet',        icon: Wallet },
  { label: 'Leaderboard', href: '/leaderboard',   icon: Trophy },
]

export const MobileBottomNav = memo(function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="flex items-center justify-around px-1 pt-2 pb-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          if (tab.highlight) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center -mt-5">
                <div className={cn(
                  'w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95',
                  'bg-gradient-to-br from-primary to-indigo-400 shadow-primary/30'
                )}>
                  <tab.icon className="w-5 h-5 text-white" />
                </div>
                <span className={cn('text-[10px] mt-1.5 font-semibold', active ? 'text-primary' : 'text-muted-foreground')}>
                  {tab.label}
                </span>
              </Link>
            )
          }
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors active:bg-muted">
              <tab.icon className={cn('w-5 h-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
})
