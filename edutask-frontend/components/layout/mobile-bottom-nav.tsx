'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListChecks, PlusCircle, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tasks', href: '/tasks', icon: ListChecks },
  { label: 'Post', href: '/post-task', icon: PlusCircle, highlight: true },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Profile', href: '/profile', icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          if (tab.highlight) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center -mt-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <tab.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className={cn('text-[10px] mt-1 font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                  {tab.label}
                </span>
              </Link>
            )
          }
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 py-1 px-3">
              <tab.icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
