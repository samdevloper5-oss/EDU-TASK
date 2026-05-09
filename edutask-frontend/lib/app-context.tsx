"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import {
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
import { ApiError, api, getStoredAccessToken, setStoredAccessToken } from '@/lib/api'
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket-service'
import { toast } from 'sonner'

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
  applyToTask: (taskId: string) => Promise<void>
  createTask: (input: {
    title: string
    description: string
    task_type: 'paid' | 'volunteer'
    budget?: number
    deadline: string
    required_skills?: string[]
  }) => Promise<void>
  createDeposit: (amount: number) => Promise<void>
  createWithdrawal: (amount: number) => Promise<void>
  sendMessage: (conversationId: string, text: string) => void
  markNotificationsRead: () => Promise<void>
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    name: string
    university: string
    department: string
    studentId: string
    location: string
    phone: string
    skills: string[]
    email: string
    password: string
    referralCode?: string
    profilePictureUrl?: string
  }) => Promise<void>
  signOut: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  refreshTasks: () => Promise<void>
  refreshWalletData: () => Promise<void>
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const emptyUser: User = {
  id: '',
  name: '',
  email: '',
  university: '',
  department: '',
  studentId: '',
  location: '',
  phone: '',
  skills: [],
  avatar: '',
  trustScore: 0,
  volunteerHours: 0,
  balance: 0,
  pendingEscrow: 0,
  completedTasks: 0,
  about: '',
  reviews: [],
  isEmailVerified: false,
  isPhoneVerified: false,
}

function mapTaskStatus(status: string): Task['status'] {
  if (status === 'completed') return 'completed'
  if (status === 'cancelled' || status === 'disputed') return 'assigned'
  if (status === 'in_progress' || status === 'under_review' || status === 'executor_selected') return 'assigned'
  return 'open'
}

function mapTask(task: any): Task {
  const skills = Array.isArray(task.required_skills) ? task.required_skills : []
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.task_type === 'volunteer' ? 'volunteer' : 'online',
    payment: task.task_type === 'paid' ? Number(task.budget ?? 0) : undefined,
    hours: task.task_type === 'volunteer' ? Number(task.hours ?? 0) : undefined,
    deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    location: 'Remote',
    postedBy: task.poster_name ?? task.poster_full_name ?? task.poster_id ?? 'Unknown',
    postedByAvatar: '',
    applicants: Number(task.application_count ?? task.applicants_count ?? 0),
    status: mapTaskStatus(task.status),
    skills,
  }
}

function mapTransaction(tx: any): Transaction {
  const type = String(tx.transaction_type || tx.type || '').toLowerCase()
  const mappedType: Transaction['type'] =
    type.includes('withdrawal') ? 'withdraw' :
      type.includes('deposit') ? 'deposit' :
        type.includes('escrow') ? 'escrow' :
          'earned'

  return {
    id: tx.id,
    date: new Date(tx.created_at || tx.createdAt || Date.now()).toISOString().split('T')[0],
    type: mappedType,
    amount: Number(tx.amount ?? 0),
    status: String(tx.status || 'completed').toLowerCase() === 'failed' ? 'failed' : String(tx.status || '').toLowerCase() === 'pending' ? 'pending' : 'completed',
    description: tx.description || tx.transaction_type || tx.type || 'Wallet transaction',
  }
}

function mapMessage(msg: any, userId: string): Message {
  return {
    id: msg.id,
    text: msg.content,
    sender: msg.sender_id === userId ? 'me' : 'other',
    timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

function mapConversation(conv: any, userId: string): Conversation {
  return {
    id: conv.id,
    name: conv.opponent_name || 'Chat',
    avatar: conv.opponent_avatar || '',
    lastMessage: conv.last_message || '',
    timestamp: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    unread: Number(conv.unread_count || 0),
    messages: [], // messages are fetched on demand
  }
}

function mapNotification(item: any): Notification {
  return {
    id: item.id,
    type: 'application',
    title: item.title || item.action || 'Notification',
    message: item.message || item.body || '',
    timestamp: item.created_at ? new Date(item.created_at).toLocaleString() : 'Now',
    read: Boolean(item.is_read),
  }
}

function toUserShape(rawUser: any, wallet?: any, completedTasks = 0): User {
  return {
    id: rawUser.id,
    name: rawUser.full_name,
    email: rawUser.email,
    university: rawUser.university_name,
    department: rawUser.department,
    studentId: rawUser.student_id,
    location: rawUser.location,
    phone: rawUser.phone,
    skills: Array.isArray(rawUser.skills) ? rawUser.skills : [],
    avatar: rawUser.profile_picture_url ?? '',
    trustScore: 0,
    volunteerHours: 0,
    balance: Number(wallet?.balance ?? 0),
    pendingEscrow: Number(wallet?.escrow_balance ?? 0),
    completedTasks,
    about: '',
    reviews: [],
    isEmailVerified: !!rawUser.email_verified,
    isPhoneVerified: !!rawUser.phone_verified,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('splash')
  const [user, setUser] = useState<User>(emptyUser)
  const [tasks, setTasks] = useState<Task[]>([])
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [appliedTasks, setAppliedTasks] = useState<Set<string>>(new Set())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const refreshWalletData = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) return
    const [walletRes, txRes] = await Promise.all([
      api.wallet.get(token),
      api.wallet.transactions(token),
    ])
    setUser(prev => ({
      ...prev,
      balance: Number(walletRes.balance ?? 0),
      pendingEscrow: Number(walletRes.escrow_balance ?? 0),
    }))
    setTransactions((txRes.data ?? []).map(mapTransaction))
  }, [])

  const refreshTasks = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) return
    const payload = await api.tasks.list('?page=1&limit=100', token)
    setTasks((payload.data ?? []).map(mapTask))
  }, [])

  const refreshNotifications = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) return
    const payload = await api.notifications.list(token)
    setNotifications((payload.data ?? []).map(mapNotification))
  }, [])

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const socket = getSocket()
    if (!socket) {
      toast.error('Chat connection lost. Reconnecting...')
      return
    }

    socket.emit('message:send', { conversationId, content: text }, (response: any) => {
      if (!response.ok) {
        toast.error(response.error || 'Failed to send message')
        return
      }
      // UI will be updated via 'message:new' event
    })
  }, [])

  const refreshConversations = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token || !user.id) return
    const payload = await api.chat.list(token)
    setConversations((payload.data ?? []).map((c: any) => mapConversation(c, user.id)))
  }, [user.id])

  const hydrateSession = useCallback(async (token: string) => {
    const [meRes, walletRes, txRes, taskRes, notifRes, chatRes] = await Promise.all([
      api.auth.me(token),
      api.wallet.get(token),
      api.wallet.transactions(token),
      api.tasks.list('?page=1&limit=100', token),
      api.notifications.list(token),
      api.chat.list(token),
    ])

    const userPayload = meRes.user ?? meRes
    const completedTasks = (taskRes.data ?? []).filter((t: any) => t.status === 'completed').length
    const userId = userPayload.id
    setUser(toUserShape(userPayload, walletRes, completedTasks))
    setTasks((taskRes.data ?? []).map(mapTask))
    setTransactions((txRes.data ?? []).map(mapTransaction))
    setNotifications((notifRes.data ?? []).map(mapNotification))
    setConversations((chatRes.data ?? []).map((c: any) => mapConversation(c, userId)))

    // Init socket
    const socket = initSocket(token);
    socket.on('notification:new', (payload) => {
      setNotifications(prev => [mapNotification(payload), ...prev]);
      toast.info(payload.title || 'New notification');
    });

    socket.on('message:new', (msg) => {
      setConversations(prev => prev.map(c =>
        c.id === msg.conversation_id
          ? {
            ...c,
            lastMessage: msg.content,
            unread: c.unread + 1,
            messages: [...c.messages, mapMessage(msg, userId)]
          }
          : c
      ));
    });

    setIsAuthenticated(true)
  }, [])

  const applyToTask = useCallback(async (taskId: string) => {
    const token = getStoredAccessToken()
    if (!token) {
      toast.error('Please sign in to apply.')
      return
    }
    await api.tasks.apply(taskId, 'Interested in this task.', token)
    setAppliedTasks(prev => new Set(prev).add(taskId))
    await refreshTasks()
  }, [refreshTasks])

  const createTask = useCallback(async (input: {
    title: string
    description: string
    task_type: 'paid' | 'volunteer'
    budget?: number
    deadline: string
    required_skills?: string[]
  }) => {
    const token = getStoredAccessToken()
    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }
    await api.tasks.create(input, token)
    await refreshTasks()
  }, [refreshTasks])

  const createDeposit = useCallback(async (amount: number) => {
    const token = getStoredAccessToken()
    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }
    await api.wallet.deposit(amount, token)
    await refreshWalletData()
  }, [refreshWalletData])

  const createWithdrawal = useCallback(async (amount: number) => {
    const token = getStoredAccessToken()
    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }
    await api.wallet.withdraw(amount, token)
    await refreshWalletData()
  }, [refreshWalletData])

  const markNotificationsRead = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) return
    await api.notifications.markRead(token)
    await refreshNotifications()
  }, [refreshNotifications])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login({ email, password })
    setStoredAccessToken(result.token)
    await hydrateSession(result.token)
    setPage('dashboard')
  }, [hydrateSession])

  const signUp = useCallback(async (input: any) => {
    const result = await api.auth.signup(input)
    setStoredAccessToken(result.token)
    await hydrateSession(result.token)
    setPage('dashboard')
  }, [hydrateSession])

  const verifyEmail = useCallback(async (token: string) => {
    await api.auth.verifyEmail(token)
    await refreshTasks() // or refresh session
  }, [refreshTasks])

  const signOut = useCallback(async () => {
    const token = getStoredAccessToken()
    try {
      await api.auth.logout(token)
    } catch {
      // keep logout resilient if token already invalid
    }
    disconnectSocket()
    setStoredAccessToken(null)
    setIsAuthenticated(false)
    setUser(emptyUser)
    setTasks([])
    setTransactions([])
    setAppliedTasks(new Set())
    setPage('landing')
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      const token = getStoredAccessToken()
      if (!token) {
        setPage('landing')
        return
      }
      try {
        await hydrateSession(token)
        setPage('dashboard')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            const refreshed = await api.auth.refresh()
            if (refreshed.token) {
              setStoredAccessToken(refreshed.token)
              await hydrateSession(refreshed.token)
              setPage('dashboard')
              return
            }
          } catch {
            // cleanup below
          }
        }
        setStoredAccessToken(null)
        setIsAuthenticated(false)
        setPage('landing')
      }
    }
    void bootstrap()
  }, [hydrateSession])

  return (
    <AppContext.Provider
      value={{
        page, setPage, user, setUser, tasks, setTasks,
        conversations, setConversations, transactions, setTransactions,
        notifications, setNotifications, appliedTasks, applyToTask,
        createTask, createDeposit, createWithdrawal,
        sendMessage, markNotificationsRead, isAuthenticated, setIsAuthenticated,
        signIn, signUp, signOut, verifyEmail, refreshTasks, refreshWalletData,
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
