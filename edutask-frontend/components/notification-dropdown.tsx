"use client"

import { useApp } from '@/lib/app-context'
import { CheckCircle2, XCircle, UserPlus, Award, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'

const iconMap = {
  application: UserPlus,
  accepted: CheckCircle2,
  rejected: XCircle,
  completed: Award,
  volunteer: Users,
}

const colorMap = {
  application: 'text-sky-500 bg-sky-50',
  accepted: 'text-emerald-500 bg-emerald-50',
  rejected: 'text-red-500 bg-red-50',
  completed: 'text-primary bg-secondary',
  volunteer: 'text-amber-500 bg-amber-50',
}

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, markNotificationsRead } = useApp()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[340px] bg-card border border-border rounded-2xl shadow-2xl shadow-primary/5 overflow-hidden z-50"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Notifications</h3>
        <button
          onClick={markNotificationsRead}
          className="text-xs text-primary hover:underline font-medium"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map(n => {
          const Icon = iconMap[n.type]
          const color = colorMap[n.type]
          return (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-0 transition-colors ${
                !n.read ? 'bg-secondary/30' : 'hover:bg-muted/30'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{n.timestamp}</p>
              </div>
              {!n.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary to-indigo-400 mt-2 flex-shrink-0 shadow-sm" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
