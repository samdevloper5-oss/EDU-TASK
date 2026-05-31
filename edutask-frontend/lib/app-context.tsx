'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  currentUser as initialUser,
  tasks as initialTasks,
  conversations as initialConversations,
  transactions as initialTransactions,
  notifications as initialNotifications,
  type User,
  type Task,
  type Conversation,
  type Transaction,
  type Notification,
  type Message,
} from '@/lib/mock-data'

type Page = 'splash' | 'landing' | 'signin' | 'signup' | 'dashboard' | 'tasks' | 'post-task' | 'my-tasks' | 'chat' | 'leaderboard' | 'wallet' | 'profile'

interface AppContextType {
  page: Page
  setPage: (page: Page) => void
  user: User
  setUser: React.Dispatch<React.SetStateAction<User>>
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  conversations: Conversation[]
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
  transactions: Transaction[]
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>
  notifications: Notification[]
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
  appliedTasks: Set<string>
  applyToTask: (taskId: string) => void
  sendMessage: (conversationId: string, text: string) => void
  markNotificationsRead: () => void
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('splash')
  const [user, setUser] = useState<User>(initialUser)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [appliedTasks, setAppliedTasks] = useState<Set<string>>(new Set())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const applyToTask = useCallback((taskId: string) => {
    setAppliedTasks(prev => new Set(prev).add(taskId))
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, applicants: t.applicants + 1 } : t)
    )
  }, [])

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      text,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: text, timestamp: newMsg.timestamp }
          : c
      )
    )
  }, [])

  const markNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  return (
    <AppContext.Provider
      value={{
        page, setPage, user, setUser, tasks, setTasks,
        conversations, setConversations, transactions, setTransactions,
        notifications, setNotifications, appliedTasks, applyToTask,
        sendMessage, markNotificationsRead, isAuthenticated, setIsAuthenticated,
        sidebarCollapsed, setSidebarCollapsed,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
