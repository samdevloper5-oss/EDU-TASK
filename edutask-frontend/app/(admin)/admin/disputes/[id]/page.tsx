import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

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

  const task = taskRes.data as
      | {
        id: string
        title: string
        status: string
        budget: number | null
        poster: { full_name?: string; email?: string } | null
        hired_worker: { full_name?: string; email?: string } | null
      }
    | null
  const messages = await Promise.all(
    ((messagesRes.data ?? []) as Array<{
      id: string
      content: string
      file_path: string | null
      file_url: string | null
      is_system_message: boolean
      flagged: boolean
      created_at: string
      sender: { full_name?: string } | null
    }>).map(async (message) => {
      if (!message.file_path) {
        return message
      }

      const { data } = await supabaseAdmin.storage.from('task-files').createSignedUrl(message.file_path, 3600)
      return {
        ...message,
        file_url: data?.signedUrl ?? message.file_url,
      }
    })
  )

  if (!task) {
    return <div className="p-6">Task not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Dispute</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">{task.title}</h1>
      </div>

      <Card className="space-y-2 p-5">
        <p><strong>Status:</strong> {task.status}</p>
        <p><strong>Budget:</strong> ৳{Number(task.budget ?? 0).toLocaleString()}</p>
        <p><strong>Poster:</strong> {task.poster?.full_name} - {task.poster?.email}</p>
        <p><strong>Worker:</strong> {task.hired_worker?.full_name} - {task.hired_worker?.email}</p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <form action={`/api/admin/disputes/${task.id}/release`} method="POST">
          <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
            Release Escrow
          </Button>
        </form>
        <form action={`/api/admin/disputes/${task.id}/refund`} method="POST">
          <Button type="submit" variant="outline">
            Refund Poster
          </Button>
        </form>
        <Button type="button" variant="outline">
          Request more info
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Message History</h2>
        {messages.map((message) => (
          <div key={message.id} className={`rounded-xl border p-3 text-sm ${message.flagged ? 'border-red-500/40 bg-red-500/5' : 'border-[#E5E5E3] bg-white'}`}>
            {!message.is_system_message && (
              <p className="mb-1 text-xs font-semibold">
                {message.sender?.full_name ?? 'Unknown'}
                {message.flagged ? ' FLAGGED' : ''}
              </p>
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.file_url && (
              <a
                href={message.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#4F46E5] underline"
              >
                Download attachment
              </a>
            )}
            <p className="mt-1 text-[10px] text-[#A3A3A3]">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
