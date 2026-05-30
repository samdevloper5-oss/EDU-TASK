'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  RotateCcw,
  Send,
  Star,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import type { Message, Task } from '@/types'

type ChatTask = Pick<
  Task,
  'id' | 'title' | 'budget' | 'status' | 'poster_id' | 'hired_worker_id' | 'revisions_used'
> & {
  poster?: { id: string; full_name: string; profile_photo_url?: string | null } | null
  worker?: { id: string; full_name: string; profile_photo_url?: string | null } | null
}

type ChatMessage = Omit<Message, 'sender'> & {
  sender?: { full_name: string; profile_photo_url?: string | null } | null
}

function ReviewModal({
  reviewedId,
  reviewedName,
  taskId,
  onClose,
  onSubmit,
}: {
  reviewedId: string
  reviewedName: string
  taskId: string
  onClose: () => void
  onSubmit: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a star rating')
      return
    }

    if (comment.trim().length < 10) {
      toast.error('Comment must be at least 10 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          reviewed_id: reviewedId,
          rating,
          comment: comment.trim(),
        }),
      })
      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error ?? 'Failed to submit review')
      }

      toast.success('Review submitted. Trust score updated.')
      onSubmit()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Rate {reviewedName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-muted"
            aria-label="Close review modal"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          How was your experience? Your review updates their Trust Score immediately.
        </p>

        <div className="mb-5 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={`star-${star}`}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-1 transition-transform hover:scale-110 active:scale-90"
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                className={`size-9 transition-colors ${
                  star <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted'
                }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="mb-4 text-center text-sm font-medium text-amber-500">
            {['', 'Weak', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Share your experience working with this person... (min 10 characters)"
          className="min-h-[100px] w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p
          className={`mb-4 mt-1 text-xs ${
            comment.length < 10 ? 'text-muted-foreground' : 'text-emerald-500'
          }`}
        >
          {comment.length} characters {comment.length < 10 ? `(${10 - comment.length} more needed)` : 'ok'}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || comment.trim().length < 10}
            className="flex-1 rounded-xl bg-primary text-primary-foreground"
          >
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Star className="mr-2 size-4" />}
            Submit Review
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Skip
          </Button>
        </div>
      </Card>
    </div>
  )
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/')
  const sizeMB = (file.size / 1024 / 1024).toFixed(1)

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm">
      {isImage ? (
        <ImageIcon className="size-4 shrink-0 text-blue-500" />
      ) : (
        <FileText className="size-4 shrink-0 text-primary" />
      )}
      <span className="max-w-[140px] truncate">{file.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{sizeMB}MB</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto shrink-0 transition-colors hover:text-destructive"
        aria-label="Remove selected file"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function FileAttachment({
  filePath,
  fileName,
}: {
  filePath: string
  fileName: string | null | undefined
}) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(
        `/api/files/signed-url?path=${encodeURIComponent(filePath)}&bucket=task-files`
      )
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error('Download link expired. Ask worker to re-upload.')
        return
      }

      window.open(json.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-2 text-sm underline underline-offset-2 hover:no-underline transition-all"
    >
      {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
      {fileName ?? 'Download attachment'}
    </button>
  )
}

export default function ChatRoomPage() {
  const params = useParams()
  const supabase = useMemo(() => createClient(), [])
  const taskId = params.taskId as string

  const [task, setTask] = useState<ChatTask | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        setError('Please sign in to access chat.')
        return
      }

      setUserId(user.id)

      try {
        const [taskRes, messageRes] = await Promise.all([
          fetch(`/api/tasks/${taskId}`),
          fetch(`/api/messages?task_id=${taskId}&limit=100`),
        ])
        const [taskJson, messageJson] = await Promise.all([taskRes.json(), messageRes.json()])

        if (!taskJson.success) {
          throw new Error(taskJson.error ?? 'Failed to load task')
        }

        if (!messageJson.success) {
          throw new Error(messageJson.error ?? 'Failed to load messages')
        }

        const taskData = taskJson.data as ChatTask
        setTask(taskData)
        setMessages((messageJson.data ?? []) as ChatMessage[])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [supabase, taskId])

  useEffect(() => {
    if (!userId) return

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`chat-room-${taskId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const newMsg = payload.new as { id: string; sender_id: string }
          if (newMsg.sender_id === userId) return

          const { data } = await supabase
            .from('messages')
            .select('*, sender:users!messages_sender_id_fkey(full_name, profile_photo_url)')
            .eq('id', newMsg.id)
            .single()

          if (data) {
            setMessages((prev) =>
              prev.some((message) => message.id === (data as ChatMessage).id)
                ? prev
                : [...prev, data as ChatMessage]
            )
            setTimeout(() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 50)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error('Chat connection lost. Please refresh.')
        }
      })

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [supabase, taskId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() && !attachedFile) {
      return
    }

    if (!userId) {
      return
    }

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    try {
      let filePath: string | undefined
      let fileName: string | undefined

      if (attachedFile) {
        setUploadingFile(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const ext = attachedFile.name.split('.').pop()
        filePath = `${user?.id}/${taskId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('task-files')
          .upload(filePath, attachedFile)

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`)
        }

        fileName = attachedFile.name
        setAttachedFile(null)
        setUploadingFile(false)
      }

      const tempId = `temp-${Date.now()}`
      const optimisticMessage: ChatMessage = {
        id: tempId,
        task_id: taskId,
        sender_id: userId,
        content: content || (fileName ? `Attachment: ${fileName}` : ''),
        file_path: filePath ?? null,
        file_name: fileName ?? null,
        is_system_message: false,
        flagged: false,
        created_at: new Date().toISOString(),
        sender: { full_name: 'You', profile_photo_url: null },
      }

      setMessages((prev) => [...prev, optimisticMessage])
      scrollToBottom()

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          content: content || (fileName ? `Attachment: ${fileName}` : 'Attachment'),
          file_path: filePath,
          file_name: fileName,
        }),
      })
      const json = await res.json()

      if (!json.success) {
        setMessages((prev) => prev.filter((message) => message.id !== tempId))
        setNewMessage(content)
        throw new Error(json.error ?? 'Failed to send message')
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempId
            ? ({
                ...json.data,
                sender: { full_name: 'You', profile_photo_url: null },
              } as ChatMessage)
            : message
        )
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
      setUploadingFile(false)
      inputRef.current?.focus()
    }
  }, [attachedFile, newMessage, scrollToBottom, supabase, taskId, userId])

  const submitWork = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/submit`, { method: 'POST' })
    const json = await res.json()

    if (!json.success) {
      toast.error(json.error ?? 'Failed to submit work')
      return
    }

    toast.success('Work submitted for review!')
    const refreshed = await fetch(`/api/tasks/${taskId}`)
    const refreshedJson = await refreshed.json()
    if (refreshedJson.success) {
      setTask(refreshedJson.data as ChatTask)
    } else {
      setTask((prev) => (prev ? { ...prev, status: 'under_review' } : prev))
    }
  }, [taskId])

  const acceptWork = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/accept`, { method: 'POST' })
    const json = await res.json()

    if (!json.success) {
      toast.error(json.error ?? 'Failed to accept work')
      return
    }

    toast.success(
      `Payment released! Tk ${json.data?.worker_payout?.toLocaleString?.() ?? ''} sent to worker.`
    )
    setTask((prev) => (prev ? { ...prev, status: 'completed' } : prev))

    const target = task?.worker ?? task?.poster
    if (target && target.id !== userId) {
      setReviewTarget({ id: target.id, name: target.full_name })
      setShowReviewModal(true)
    }
  }, [task, taskId, userId])

  const requestRevision = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Please revise the work based on the discussion in chat.' }),
    })
    const json = await res.json()

    if (!json.success) {
      toast.error(json.error ?? 'Failed to request revision')
      return
    }

    toast.success('Revision requested. Worker has been notified.')
    setTask((prev) =>
      prev
        ? {
            ...prev,
            status: 'in_progress',
            revisions_used: (prev.revisions_used ?? 0) + 1,
          }
        : prev
    )
  }, [taskId])

  const openDispute = useCallback(async () => {
    const reason = window.prompt(
      'Open a dispute? Enter a short reason for the admin review. Minimum 20 characters.'
    )

    if (!reason) {
      return
    }

    const trimmedReason = reason.trim()
    if (trimmedReason.length < 20) {
      toast.error('Please provide at least 20 characters for the dispute reason.')
      return
    }

    const res = await fetch(`/api/tasks/${taskId}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: trimmedReason }),
    })
    const json = await res.json()

    if (!json.success) {
      toast.error(json.error ?? 'Failed to open dispute')
      return
    }

    toast.success('Dispute opened. Admin will review within 24 hours.')
    setTask((prev) => (prev ? { ...prev, status: 'disputed' } : prev))
  }, [taskId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not allowed. Use JPG, PNG, PDF, DOC, DOCX, TXT, or ZIP.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB.')
      return
    }

    setAttachedFile(file)
    event.target.value = ''
  }

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  if (loading) {
    return (
      <div className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col gap-3 md:h-[calc(100vh-80px)]">
        <div className="h-12 animate-pulse rounded-2xl bg-muted" />
        <div className="flex-1 animate-pulse rounded-2xl bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{error ?? 'Task not found'}</p>
        <Link href="/chat">
          <Button type="button" variant="outline" className="mt-4 rounded-xl">
            Back to Messages
          </Button>
        </Link>
      </div>
    )
  }

  const isPoster = userId === task.poster_id
  const isWorker = userId === task.hired_worker_id
  const isParticipant = isPoster || isWorker
  const canSendMessage = isParticipant && !['completed', 'cancelled'].includes(task.status)
  const workerCanSubmit = isWorker && (task.status === 'in_progress' || task.status === 'hired')
  const posterCanReview = isPoster && task.status === 'under_review'
  const eitherCanDispute = isParticipant && ['hired', 'in_progress', 'under_review'].includes(task.status)

  const statusBadge: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: 'bg-emerald-500/10 text-emerald-600' },
    hired: { label: 'Hired', color: 'bg-blue-500/10 text-blue-600' },
    in_progress: { label: 'In Progress', color: 'bg-violet-500/10 text-violet-600' },
    under_review: { label: 'Under Review', color: 'bg-amber-500/10 text-amber-600' },
    completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600' },
    disputed: { label: 'Disputed', color: 'bg-red-500/10 text-red-600' },
    cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
  }

  const badge = statusBadge[task.status] ?? statusBadge.open

  return (
    <>
      {showReviewModal && reviewTarget && (
        <ReviewModal
          taskId={taskId}
          reviewedId={reviewTarget.id}
          reviewedName={reviewTarget.name}
          onClose={() => setShowReviewModal(false)}
          onSubmit={() => setShowReviewModal(false)}
        />
      )}

      <div
        className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col md:h-[calc(100vh-80px)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex shrink-0 items-center gap-3 px-1 py-3">
          <Link href="/chat" aria-label="Back to messages">
            <ArrowLeft className="size-5 text-muted-foreground transition-colors hover:text-foreground" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              {task.title}
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${badge.color}`}>
                {badge.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" /> Tk {task.budget?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-border">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto mb-3 size-10 opacity-30" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}

            {messages.map((message) => {
              const isMe = message.sender_id === userId
              const isSystem = message.is_system_message

              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                      {message.content}
                    </span>
                  </div>
                )
              }

              return (
                <div key={message.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="mt-auto size-7 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary">
                      {message.sender?.profile_photo_url ? (
                        <img src={message.sender.profile_photo_url} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs font-bold">
                          {message.sender?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex max-w-[75%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md bg-muted text-foreground'
                      }`}
                    >
                      {message.file_path ? (
                        <FileAttachment
                          filePath={message.file_path}
                          fileName={message.file_name}
                        />
                      ) : message.file_url ? (
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 underline underline-offset-2 ${
                            isMe ? 'text-primary-foreground' : 'text-primary'
                          }`}
                        >
                          <Paperclip className="size-3.5 shrink-0" />
                          {message.file_name ?? 'Attachment'}
                        </a>
                      ) : (
                        <p className="break-words whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    <p className="mt-1 px-1 text-[10px] text-muted-foreground">
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

          <div className="border-t border-border bg-card">
            {(posterCanReview || workerCanSubmit || eitherCanDispute) && (
              <div
                className={`flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 ${
                  posterCanReview
                    ? 'bg-amber-500/5'
                    : workerCanSubmit
                      ? 'bg-primary/5'
                      : 'bg-background'
                }`}
              >
                {workerCanSubmit && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={submitWork}
                    className="h-8 gap-1.5 rounded-xl bg-primary text-xs text-primary-foreground"
                  >
                    <Upload className="size-3.5" /> Submit Work
                  </Button>
                )}

                {posterCanReview && (
                  <>
                    <span className="hidden text-xs font-medium text-amber-700 sm:block">
                      Work submitted - your action:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={acceptWork}
                      className="h-8 gap-1.5 rounded-xl bg-emerald-500 text-xs text-white hover:bg-emerald-600"
                    >
                      <CheckCircle className="size-3.5" /> Accept and Pay
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={requestRevision}
                      disabled={(task.revisions_used ?? 0) >= 2}
                      className="h-8 gap-1.5 rounded-xl text-xs"
                    >
                      <RotateCcw className="size-3.5" /> Revise ({task.revisions_used ?? 0}/2)
                    </Button>
                  </>
                )}

                {eitherCanDispute && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={openDispute}
                    className="ml-auto h-8 gap-1.5 rounded-xl text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  >
                    <AlertTriangle className="size-3.5" /> Dispute
                  </Button>
                )}
              </div>
            )}

            {attachedFile && (
              <div className="px-3 pt-2">
                <FilePreview file={attachedFile} onRemove={() => setAttachedFile(null)} />
              </div>
            )}

            {canSendMessage ? (
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="shrink-0 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Attach file"
                >
                  {uploadingFile ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="h-10 flex-1 rounded-xl border-border bg-background text-sm"
                  disabled={sending}
                />

                <Button
                  type="button"
                  size="icon"
                  onClick={handleSend}
                  disabled={sending || (!newMessage.trim() && !attachedFile) || uploadingFile}
                  className="size-10 shrink-0 rounded-xl bg-primary text-primary-foreground"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                {task.status === 'completed' && 'This task is completed.'}
                {task.status === 'disputed' && 'This task is under dispute review.'}
                {task.status === 'cancelled' && 'This task was cancelled.'}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

