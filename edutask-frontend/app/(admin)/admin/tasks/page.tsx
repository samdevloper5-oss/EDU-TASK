import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : 'all'
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('id, title, category, budget, status, created_at, poster:users!tasks_poster_id_fkey(full_name), worker:users!tasks_hired_worker_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    query = query.eq('status', status as 'open' | 'hired' | 'in_progress' | 'under_review' | 'completed' | 'disputed' | 'cancelled')
  }

  const { data } = await query
  const tasks = (data ?? []) as Array<{
    id: string
    title: string
    category: string
    budget: number | null
    status: string
    created_at: string
    poster: { full_name?: string } | null
    worker: { full_name?: string } | null
  }>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Tasks</h1>
      </div>

      <form className="flex gap-3">
        <select name="status" defaultValue={status} className="h-10 rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="hired">Hired</option>
          <option value="in_progress">In Progress</option>
          <option value="under_review">Under Review</option>
          <option value="completed">Completed</option>
          <option value="disputed">Disputed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="h-10 rounded-lg bg-[#4F46E5] px-4 text-sm text-white">Filter</button>
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F2] text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Poster</th>
              <th className="px-4 py-3">Worker</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E3]">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-[#F4F4F2]">
                <td className="px-4 py-3 font-medium">{task.title}</td>
                <td className="px-4 py-3 text-[#6B6B6B]">{task.category}</td>
                <td className="px-4 py-3">৳{Number(task.budget ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3">{(task as any).poster?.full_name ?? '—'}</td>
                <td className="px-4 py-3">{(task as any).worker?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-medium capitalize">{task.status.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-[#6B6B6B]">{new Date(task.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-xs">
                    <Link className="text-[#4F46E5] hover:underline" href={`/tasks/${task.id}`}>View</Link>
                    <button className="text-[#6B6B6B] hover:text-[#0F0F0F]">Cancel</button>
                    <button className="text-[#6B6B6B] hover:text-[#0F0F0F]">Force complete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
