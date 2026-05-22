import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type DisputeTaskDetail = {
  title: string
  status: string
  budget: number | null
  poster: { full_name?: string; email?: string } | null
  hired_worker: { full_name?: string; email?: string } | null
}

type DisputeMessageDetail = {
  id: string
  content: string
  file_url: string | null
  is_system_message: boolean
  flagged: boolean
  created_at: string
  sender: { full_name?: string } | null
}

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  const [taskRes, messagesRes] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select(
        '*, poster:users!tasks_poster_id_fkey(full_name, email), hired_worker:users!tasks_hired_worker_id_fkey(full_name, email)'
      )
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(full_name)')
      .eq('task_id', id)
      .order('created_at', { ascending: true }),
  ])

  const task = (taskRes.data ?? null) as DisputeTaskDetail | null
  const messages = (messagesRes.data ?? []) as DisputeMessageDetail[]

  if (!task) {
    return <div className="p-6">Task not found</div>
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Dispute: {task.title}</h1>
      <Card className="space-y-2 rounded-2xl p-5 text-sm">
        <p><strong>Status:</strong> {task.status}</p>
        <p><strong>Budget:</strong> Tk {task.budget?.toLocaleString()}</p>
        <p><strong>Poster:</strong> {task.poster?.full_name} - {task.poster?.email}</p>
        <p><strong>Worker:</strong> {task.hired_worker?.full_name} - {task.hired_worker?.email}</p>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Full Message History ({messages.length} messages)</h2>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl border p-3 text-sm ${
              message.is_system_message
                ? 'border-border bg-muted text-center italic text-muted-foreground'
                : 'border-border bg-card'
            } ${message.flagged ? 'border-red-500/50 bg-red-500/5' : ''}`}
          >
            {!message.is_system_message && (
              <p className="mb-1 text-xs font-semibold">
                {message.sender?.full_name ?? 'Unknown'}
                {message.flagged ? ' FLAGGED' : ''}
              </p>
            )}
            <p>{message.content}</p>
            {message.file_url && (
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                View Attachment
              </a>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
