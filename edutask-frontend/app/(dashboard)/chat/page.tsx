'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'
import { useAuthStore } from '@/lib/store/auth.store'

interface Conversation {
  id: string
  title: string
  status: string
  poster_id: string
  hired_worker_id: string | null
  poster: { full_name: string; profile_photo_url: string | null } | null
  worker: { full_name: string; profile_photo_url: string | null } | null
  updated_at: string
}

const statusLabel: Record<string, string> = {
  hired: 'Waiting for work submission',
  in_progress: 'Work in progress',
  under_review: 'Work submitted - review needed',
  completed: 'Completed',
  disputed: 'Disputed - under review',
}

const statusColor: Record<string, string> = {
  hired: 'bg-blue-500/10 text-blue-600',
  in_progress: 'bg-violet-500/10 text-violet-600',
  under_review: 'bg-amber-500/10 text-amber-600',
  completed: 'bg-emerald-500/10 text-emerald-600',
  disputed: 'bg-red-500/10 text-red-600',
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  currentUserId,
}: {
  conversation: Conversation
  currentUserId: string
}) {
  const isPoster = conversation.poster_id === currentUserId
  const otherUser = isPoster ? conversation.worker : conversation.poster
  const otherName = otherUser?.full_name ?? 'Unknown User'
  const otherAvatar = otherUser?.profile_photo_url ?? null
  const role = isPoster ? 'Poster' : 'Worker'

  return (
    <Link href={`/chat/${conversation.id}`}>
      <Card className="cursor-pointer rounded-2xl border-border p-4 transition-all hover:bg-muted/30 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary">
            {otherAvatar ? (
              <img src={otherAvatar} alt={otherName} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-sm font-bold">
                {otherName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                {otherName}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                  statusColor[conversation.status] ?? 'bg-muted text-muted-foreground'
                }`}
              >
                {conversation.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{conversation.title}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              {statusLabel[conversation.status] ?? conversation.status}
              <span className="ml-auto opacity-60">You: {role}</span>
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
})

export default function ChatListPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchConversations = async () => {
      try {
        const { data: tasks, error: fetchError } = await supabase
          .from('tasks')
          .select(`
            id, title, status, poster_id, hired_worker_id, updated_at,
            poster:users!tasks_poster_id_fkey(full_name, profile_photo_url),
            worker:users!tasks_hired_worker_id_fkey(full_name, profile_photo_url)
          `)
          .or(`poster_id.eq.${user.id},hired_worker_id.eq.${user.id}`)
          .not('status', 'eq', 'open')
          .not('status', 'eq', 'cancelled')
          .order('updated_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        setConversations((tasks as unknown as Conversation[]) ?? [])
        setError(null)
      } catch (err) {
        console.error('Chat list fetch error:', err)
        setError('Failed to load conversations. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    void fetchConversations()
  }, [user?.id, supabase])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="mb-6 h-8 w-32 animate-pulse rounded-xl bg-muted" />
        {['chat-skeleton-1', 'chat-skeleton-2', 'chat-skeleton-3', 'chat-skeleton-4'].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
        Messages
        {conversations.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </span>
        )}
      </h1>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!error && conversations.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <MessageCircle className="mx-auto mb-4 size-12 opacity-30" />
          <p className="font-medium">No conversations yet</p>
          <p className="mt-1 text-sm">Conversations appear here after a task is hired</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              currentUserId={user?.id ?? ''}
            />
          ))}
        </div>
      )}
    </div>
  )
}

