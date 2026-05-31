'use client'

import { CheckCircle2, XCircle, UserPlus, Award, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'

type Notification = {
  id: string
  type: 'application' | 'accepted' | 'rejected' | 'completed' | 'volunteer'
  title: string
  message: string
  timestamp: string
  read: boolean
}

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

const mockNotifications: Notification[] = [
  { id: 'n1', type: 'application', title: 'New Application', message: 'Sadia R. applied to your "Presentation Slides" task.', timestamp: '5 min ago', read: false },
  { id: 'n2', type: 'accepted', title: 'Application Accepted', message: 'Your application for "Portfolio Website" was accepted!', timestamp: '1 hour ago', read: false },
  { id: 'n3', type: 'completed', title: 'Task Completed', message: '"Mobile App Testing" has been marked as completed.', timestamp: '3 hours ago', read: true },
  { id: 'n4', type: 'volunteer', title: 'Volunteer Slots Filling', message: 'Only 5 spots left for "Campus Clean-Up Drive".', timestamp: '5 hours ago', read: true },
  { id: 'n5', type: 'rejected', title: 'Application Update', message: 'Your application for "Logo Design" was not selected.', timestamp: '1 day ago', read: true },
]

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const notifications = mockNotifications
  const unreadCount = notifications.filter(n => !n.read).length

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
        {unreadCount > 0 && (
          <span className="text-xs text-primary hover:underline font-medium cursor-pointer">
            Mark all read
          </span>
        )}
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
              <div className={`size-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{n.timestamp}</p>
              </div>
              {!n.read && (
                <div className="size-2.5 rounded-full bg-gradient-to-br from-primary to-indigo-400 mt-2 flex-shrink-0 shadow-sm" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
