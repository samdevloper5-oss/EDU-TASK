'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth.store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, CheckCircle, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Message, Task } from '@/types'

type ChatTask = Pick<
  Task,
  'id' | 'title' | 'budget' | 'status' | 'poster_id' | 'hired_worker_id' | 'revisions_used'
>

type ChatMessage = Message & {
  sender?: { full_name: string } | null
}

export default function ChatRoomPage() {
  const params = useParams()
  const supabase = createClient()
  const { user: authUser } = useAuthStore()
  const taskId = params.taskId as string
  const userId = authUser?.id ?? null

  const [task, setTask] = useState<ChatTask | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      if (!userId) {
        setLoading(false)
        setError('Please sign in to access chat.')
        return
      }

      try {
        const [taskRes, msgRes] = await Promise.all([
          fetch(`/api/tasks/${taskId}`),
          fetch(`/api/messages?task_id=${taskId}&limit=100`),
        ])

        const taskJson = await taskRes.json()
        const msgJson = await msgRes.json()

        if (!taskRes.ok || !taskJson.success) {
          throw new Error(taskJson.error ?? 'Failed to load task')
        }

        if (!msgRes.ok || !msgJson.success) {
          throw new Error(msgJson.error ?? 'Failed to load messages')
        }

        setTask(taskJson.data as ChatTask)
        setMessages((msgJson.data ?? []) as ChatMessage[])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [taskId, userId])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const newId = (payload.new as { id: string }).id

          setMessages((prev) => {
            if (prev.some((message) => message.id === newId)) return prev
            return prev
          })

          const { data } = await supabase
            .from('messages')
            .select('*, sender:users!messages_sender_id_fkey(full_name)')
            .eq('id', newId)
            .single()

          const message = data as ChatMessage | null
          if (message) {
            setMessages((prev) =>
              prev.some((existingMessage) => existingMessage.id === message.id)
                ? prev
                : [...prev, message]
            )
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, taskId])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !userId || !task) return
    const content = newMessage.trim()
    setNewMessage('')

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      task_id: taskId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      is_system_message: false,
      flagged: false,
      sender: { full_name: 'You' } as any,
    }
    setMessages((prev) => [...prev, optimisticMsg])

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, content }),
    })
    const json = await res.json()

    if (!json.success) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      toast.error(json.error ?? 'Failed to send message')
      setNewMessage(content)
      return
    }

    setMessages((prev) =>
      prev.map((m) => m.id === optimisticMsg.id ? { ...json.data, sender: { full_name: 'You' } } : m)
    )
  }, [newMessage, userId, taskId, task])

  const submitWork = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const json = await res.json()
    if (!json.success) {
      toast.error(json.error ?? 'Failed to submit work')
      return
    }
    toast.success('Work submitted for review')
    setTask((currentTask) =>
      currentTask ? { ...currentTask, status: 'under_review' } : currentTask
    )
  }, [taskId])

  const acceptWork = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/accept`, { method: 'POST' })
    const json = await res.json()
    if (!json.success) {
      toast.error(json.error ?? 'Failed to accept work')
      return
    }
    toast.success('Payment released to worker')
    setTask((currentTask) =>
      currentTask ? { ...currentTask, status: 'completed' } : currentTask
    )
  }, [taskId])

  const requestRevision = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Please revise the work based on the feedback discussed.',
      }),
    })
    const json = await res.json()
    if (!json.success) {
      toast.error(json.error ?? 'Failed to request revision')
      return
    }
    toast.success('Revision requested')
    setTask((currentTask) =>
      currentTask
        ? {
            ...currentTask,
            status: 'in_progress',
            revisions_used: (currentTask.revisions_used ?? 0) + 1,
          }
        : currentTask
    )
  }, [taskId])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !task) {
    return <div className="text-center py-20 text-muted-foreground">{error ?? 'Task not found'}</div>
  }

  const isPoster = userId === task.poster_id
  const isWorker = userId === task.hired_worker_id

  return (
    <div className="space-y-4 max-w-3xl mx-auto h-[calc(100vh-64px)] md:h-[calc(100vh-140px)] flex flex-col pb-[max(0px,env(keyboard-inset-height))]">
      <div className="flex items-center gap-3">
        <Link href="/chat">
          <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </Link>
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            {task.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            Budget: Tk {task.budget?.toLocaleString()} · Status:{' '}
            <span className="capitalize font-medium text-primary">{task.status}</span>
          </p>
        </div>
      </div>

      {task.status === 'under_review' && isPoster && (
        <Card className="p-4 border-border bg-amber-50/50 rounded-2xl">
          <p className="text-sm font-medium mb-3">Work has been submitted. Please review:</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={acceptWork}
              className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg"
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Accept & Pay
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={requestRevision}
              disabled={task.revisions_used >= 2}
              className="rounded-lg"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Request Revision ({task.revisions_used ?? 0}
              /2)
            </Button>
          </div>
        </Card>
      )}

      {(task.status === 'hired' || task.status === 'in_progress') && isWorker && (
        <Card className="p-4 border-border bg-primary/5 rounded-2xl">
          <p className="text-sm mb-2">Complete the work and submit when ready.</p>
          <Button
            size="sm"
            onClick={submitWork}
            className="bg-primary text-primary-foreground rounded-lg"
          >
            Submit Work for Review
          </Button>
        </Card>
      )}

      <Card className="flex-1 border-border overflow-hidden flex flex-col rounded-2xl">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10">
              No messages yet. Start the conversation!
            </div>
          )}
          {messages.map((message) => {
            const isMe = message.sender_id === userId
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {message.sender?.full_name ?? 'System'} ·{' '}
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-primary text-primary-foreground rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
