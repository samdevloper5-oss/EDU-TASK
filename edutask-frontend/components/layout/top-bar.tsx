'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth.store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, LogOut, User, MessageCircle, Wallet } from 'lucide-react'
import Link from 'next/link'

function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const qc = useQueryClient()
  const [showDropdown, setShowDropdown] = useState(false)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      return json.success ? (json.data?.notifications ?? []) : []
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })

  const unreadCount = notifications.filter((n: any) => !n.is_read).length

  useEffect(() => {
    let channel: any

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          qc.invalidateQueries({ queryKey: ['notifications'] })
        })
        .subscribe()
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, qc])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/mark-read', { method: 'POST' })
    qc.setQueryData(['notifications'], (old: any) => {
      const notifs = old?.notifications ?? []
      return { ...old, notifications: notifs.map((n: any) => ({ ...n, is_read: true })) }
    })
  }, [qc])

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
              ) : (
                (notifications as any[]).slice(0, 20).map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? '#'}
                    onClick={() => setShowDropdown(false)}
                    className={`block p-3 border-b border-border hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const MemoNotificationBell = memo(NotificationBell)

function UserMenu() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, clearAuth } = useAuthStore()
  const [open, setOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearAuth()
    router.push('/')
  }, [supabase, clearAuth, router])

  const initial = user?.full_name?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl hover:bg-muted p-1.5 transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
          {user?.profile_photo_url
            ? <img src={user.profile_photo_url} alt={user.full_name ?? 'User'} className="w-full h-full object-cover" />
            : initial}
        </div>
        <span className="hidden md:block text-sm font-medium text-foreground max-w-[100px] truncate">
          {user?.full_name?.split(' ')[0] ?? 'User'}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden py-1">
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <User className="w-4 h-4 text-muted-foreground" /> Profile
            </Link>
            <Link href="/wallet" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <Wallet className="w-4 h-4 text-muted-foreground" /> Wallet
            </Link>
            <Link href="/chat" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <MessageCircle className="w-4 h-4 text-muted-foreground" /> Messages
            </Link>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const MemoUserMenu = memo(UserMenu)

export const TopBar = memo(function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <MemoNotificationBell />
        <MemoUserMenu />
      </div>
    </header>
  )
})
