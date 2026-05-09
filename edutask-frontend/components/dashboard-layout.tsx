"use client"

import { useApp } from '@/lib/app-context'
import { useState } from 'react'
import {
  LayoutDashboard, ListChecks, PlusCircle, MessageCircle,
  Trophy, Wallet, User, Bell, Settings, ChevronLeft, ChevronRight,
  LogOut, ClipboardList, Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NotificationDropdown } from '@/components/notification-dropdown'

type DashboardPage = 'dashboard' | 'tasks' | 'post-task' | 'my-tasks' | 'chat' | 'leaderboard' | 'wallet' | 'profile'

const navItems: { id: DashboardPage; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'tasks', icon: ListChecks, label: 'Tasks' },
  { id: 'post-task', icon: PlusCircle, label: 'Post Task' },
  { id: 'my-tasks', icon: ClipboardList, label: 'My Tasks' },
  { id: 'chat', icon: MessageCircle, label: 'Chat' },
  { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
  { id: 'wallet', icon: Wallet, label: 'Wallet' },
  { id: 'profile', icon: User, label: 'Profile' },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { page, setPage, user, sidebarCollapsed, setSidebarCollapsed, notifications, signOut } = useApp()
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-card border-r border-border z-30 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 p-5 border-b border-border h-[68px]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
            <span className="text-primary-foreground font-bold text-sm">E</span>
          </div>
          {!sidebarCollapsed && <span className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {sidebarCollapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={() => { void signOut() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border h-[68px]">
          <div className="flex items-center justify-between px-8 h-full">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-foreground capitalize" style={{ fontFamily: 'var(--font-heading)' }}>
                {page === 'post-task' ? 'Post Task' : page === 'my-tasks' ? 'My Tasks' : page}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="w-56 pl-9 bg-muted/50 border-transparent focus:border-primary h-9 text-sm"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-primary to-indigo-500 text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationDropdown onClose={() => setShowNotifications(false)} />
                )}
              </div>

              <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <Settings className="w-[18px] h-[18px]" />
              </button>

              {/* Avatar */}
              <button
                onClick={() => setPage('profile')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary font-bold text-sm hover:shadow-md transition-all"
              >
                {user.name ? user.name[0] : "U"}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

