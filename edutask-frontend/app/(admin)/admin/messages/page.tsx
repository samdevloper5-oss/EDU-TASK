import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FlagTriangleRight } from 'lucide-react'
import Link from 'next/link'

export default async function AdminMessagesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('messages')
    .select('id, content, flagged, created_at, task_id, sender_id, file_path, file_url, task:tasks!messages_task_id_fkey(title, poster:users!tasks_poster_id_fkey(full_name), hired_worker:users!tasks_hired_worker_id_fkey(full_name)), sender:users!messages_sender_id_fkey(full_name)')
    .eq('flagged', true)
    .order('created_at', { ascending: false })
    .limit(100)

  const messages = (data ?? []) as Array<{
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
  }>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Flagged Messages</h1>
      </div>

      {(data ?? []).length === 0 ? (
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
                  <p className="font-medium text-[#0F0F0F]">{(message as any).task?.title ?? 'Task'}</p>
                  <p className="text-xs text-[#A3A3A3]">
                    {(message as any).task?.poster?.full_name ?? 'Poster'} · {(message as any).task?.hired_worker?.full_name ?? 'Worker'}
                  </p>
                </div>
                <Link href={`/admin/disputes/${message.task_id}`} className="text-sm text-[#4F46E5] hover:underline">
                  Open task
                </Link>
              </div>
              <p className="text-sm text-[#0F0F0F]">{message.content}</p>
              <div className="flex flex-wrap gap-2">
                <form action={`/api/admin/messages/${message.id}/clear-flag`} method="POST">
                  <Button size="sm" type="submit" variant="outline">Clear flag</Button>
                </form>
                <form action={`/api/admin/messages/${message.id}/warn`} method="POST">
                  <Button size="sm" type="submit" variant="outline">Warn user</Button>
                </form>
                <form action={`/api/admin/users/${message.sender_id}/ban`} method="POST">
                  <input type="hidden" name="is_banned" value="true" />
                  <Button size="sm" type="submit" className="bg-red-600 text-white hover:bg-red-700">Ban user</Button>
                </form>
              </div>
              <p className="text-[11px] text-[#A3A3A3]">{new Date(message.created_at).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
