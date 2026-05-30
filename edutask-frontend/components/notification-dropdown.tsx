'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Bell } from 'lucide-react'
import type { Notification } from '@/types'

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (json.success) setNotifications(json.data ?? [])
    }
    load()

    let removeChannel: (() => void) | undefined
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev])
          }
        )
        .subscribe()
      removeChannel = () => { supabase.removeChannel(channel) }
    }
    setupRealtime()
    return () => { removeChannel?.() }
  }, [supabase])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[340px] bg-card border border-border rounded-2xl shadow-2xl shadow-primary/5 overflow-hidden z-50"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Notifications</h3>
        <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
          Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No notifications yet</p>
        )}
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.link ?? '#'}
            onClick={onClose}
            className={`flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/30 ${
              !n.is_read ? 'bg-secondary/30' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

