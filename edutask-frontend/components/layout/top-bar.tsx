'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useAuthStore } from '@/lib/store/auth.store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, LogOut, User, MessageCircle, Wallet, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  title: string
  message: string
  is_read: boolean
  link?: string | null
  created_at: string
}

function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const qc = useQueryClient()
  const [showDropdown, setShowDropdown] = useState(false)

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      return json.success ? (json.data?.notifications ?? []) : []
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

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
    const res = await fetch('/api/notifications/mark-read', { method: 'POST' })
    if (!res.ok) {
      toast.error('Failed to mark notifications as read')
      return
    }

    qc.setQueryData(['notifications'], (old: NotificationItem[] | undefined) =>
      (old ?? []).map((notification) => ({ ...notification, is_read: true }))
    )
  }, [qc])

  const clearAll = useCallback(async () => {
    const res = await fetch('/api/notifications/clear', { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to clear notifications')
      return
    }

    qc.setQueryData(['notifications'], [] as NotificationItem[])
    toast.success('Notifications cleared')
  }, [qc])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="size-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                setShowDropdown(false)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close notifications"
          />
          <div
            className="
              fixed inset-x-0 bottom-0 top-auto z-20 overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl
              md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-96 md:rounded-2xl
            "
          >
            <div className="absolute inset-x-0 top-0 flex justify-center pb-1 pt-2 pointer-events-none md:hidden">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
              <span className="text-base font-semibold">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="rounded-lg p-1 transition-colors hover:bg-muted md:hidden"
                  aria-label="Close notifications"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto overscroll-contain md:max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto mb-3 size-10 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.link ?? '#'}
                    onClick={async () => {
                      setShowDropdown(false)
                      if (!notification.is_read) {
                        await fetch('/api/notifications/mark-read', { method: 'POST' })
                        qc.setQueryData(['notifications'], (old: NotificationItem[] | undefined) =>
                          (old ?? []).map((item) =>
                            item.id === notification.id ? { ...item, is_read: true } : item
                          )
                        )
                      }
                    }}
                    className={`flex items-start gap-3 border-b border-border p-4 transition-colors hover:bg-muted/50 active:bg-muted ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        !notification.is_read ? 'bg-primary' : 'bg-transparent'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('en-BD', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="md:hidden" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
          </div>
        </>
      )}
    </div>
  )
}

const MemoNotificationBell = memo(NotificationBell)

function UserMenu() {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [open, setOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Fallback — clear locally if API fails
    }
    clearAuth()
    router.push('/')
    router.refresh()
  }, [clearAuth, router])

  const initial = user?.full_name?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl hover:bg-muted p-1.5 transition-colors"
        aria-label="User menu"
      >
        <div className="size-8 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
          {user?.profile_photo_url
            ? <img src={user.profile_photo_url} alt={user.full_name ?? 'User'} className="size-full object-cover" />
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
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="size-4" /> Sign out
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

