'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FlagTriangleRight, Loader2 } from 'lucide-react'

type FlaggedMessage = {
  id: string
  content: string
  flagged: boolean
  created_at: string
  task_id: string
  sender_id: string | null
  file_path: string | null
  file_url: string | null
  task: {
    title?: string
    poster?: { full_name?: string } | null
    hired_worker?: { full_name?: string } | null
  } | null
  sender: { full_name?: string } | null
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<FlaggedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/messages')
      const json = await res.json()
      if (json.success) {
        setMessages(json.data ?? [])
      } else {
        toast.error(json.error ?? 'Failed to load messages')
      }
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleAction = async (url: string, messageId: string, successMsg: string) => {
    setActing(messageId)
    try {
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(successMsg)
        fetchMessages()
      } else {
        toast.error(json.error ?? 'Action failed')
      }
    } catch {
      toast.error('Action failed')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Flagged Messages</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[#4F46E5]" />
        </div>
      ) : messages.length === 0 ? (
        <Card className="p-10 text-center text-[#6B6B6B]">
          <FlagTriangleRight className="mx-auto mb-3 size-10 opacity-40" />
          <p>No flagged messages</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[#0F0F0F]">{message.task?.title ?? 'Task'}</p>
                  <p className="text-xs text-[#A3A3A3]">
                    {message.task?.poster?.full_name ?? 'Poster'} · {message.task?.hired_worker?.full_name ?? 'Worker'}
                  </p>
                </div>
                <Link href={`/admin/disputes/${message.task_id}`} className="text-sm text-[#4F46E5] hover:underline">
                  Open task
                </Link>
              </div>
              <p className="text-sm text-[#0F0F0F]">{message.content}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={acting === message.id}
                  onClick={() => handleAction(`/api/admin/messages/${message.id}/clear-flag`, message.id, 'Flag cleared')}
                >
                  {acting === message.id ? <Loader2 className="size-3 animate-spin" /> : null}
                  Clear flag
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={acting === message.id}
                  onClick={() => handleAction(`/api/admin/messages/${message.id}/warn`, message.id, 'User warned')}
                >
                  {acting === message.id ? <Loader2 className="size-3 animate-spin" /> : null}
                  Warn user
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={acting === message.id}
                  onClick={async () => {
                    setActing(message.id)
                    try {
                      const res = await fetch(`/api/admin/users/${message.sender_id}/ban`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_banned: true }),
                      })
                      const json = await res.json()
                      if (json.success) {
                        toast.success('User banned')
                        fetchMessages()
                      } else {
                        toast.error(json.error ?? 'Failed to ban user')
                      }
                    } catch {
                      toast.error('Failed to ban user')
                    } finally {
                      setActing(null)
                    }
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {acting === message.id ? <Loader2 className="size-3 animate-spin" /> : null}
                  Ban user
                </Button>
              </div>
              <p className="text-[11px] text-[#A3A3A3]">{new Date(message.created_at).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
