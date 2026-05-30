import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('id, title, budget, created_at, poster:users!tasks_poster_id_fkey(full_name), worker:users!tasks_hired_worker_id_fkey(full_name)')
    .eq('status', 'disputed')
    .order('created_at', { ascending: false })

  const disputes = (data ?? []) as Array<{
    id: string
    title: string
    budget: number | null
    created_at: string
    poster: { full_name?: string } | null
    worker: { full_name?: string } | null
  }>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Disputes</h1>
      </div>

      {(data ?? []).length === 0 ? (
        <Card className="p-10 text-center text-[#6B6B6B]">
          <AlertTriangle className="mx-auto mb-3 size-10 opacity-40" />
          <p>No active disputes</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((task) => (
            <Card key={task.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-[#0F0F0F]">{task.title}</h3>
                  <p className="text-sm text-[#6B6B6B] mt-1">Budget: ৳{Number(task.budget ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-[#A3A3A3] mt-1">
                    {task.poster?.full_name ?? 'Poster'} · {task.worker?.full_name ?? 'Worker'}
                  </p>
                  <p className="text-[11px] text-[#A3A3A3] mt-1">
                    {new Date(task.created_at).toLocaleString()}
                  </p>
                </div>
                <Link href={`/admin/disputes/${task.id}`} className="text-sm text-[#4F46E5] hover:underline">
                  Open
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
