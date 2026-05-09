'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, LogOut, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function TopBar() {
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: profile } = await supabase.from('users').select('name').eq('id', authUser.id).single()
      setUser(profile)

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setNotifications(notifs ?? [])
      setUnreadCount((notifs ?? []).filter((n) => !n.is_read).length)
    }
    fetchData()
  }, [supabase])

  const markAllRead = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', authUser.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between gap-4">
      <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          className="h-9 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
          onClick={() => router.push('/tasks')}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-xl hover:bg-muted transition-colors"
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
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
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
                    notifications.map((n) => (
                      <div key={n.id} className={`p-3 border-b border-border hover:bg-muted/30 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <button onClick={handleSignOut} className="p-2 rounded-xl hover:bg-muted transition-colors md:hidden">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  )
}
