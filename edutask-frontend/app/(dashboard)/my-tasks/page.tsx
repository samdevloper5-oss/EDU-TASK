'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Loader2, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function MyTasksPage() {
  const supabase = useMemo(() => createClient(), [])
  const qc = useQueryClient()
  const [tab, setTab] = useState<'posted' | 'applied' | 'active'>('posted')

  const { data: tasks = [], isLoading: loadingPosted } = useQuery({
    queryKey: ['my-tasks', 'posted'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('tasks')
        .select('*, applications(count)')
        .eq('poster_id', user.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    staleTime: 30 * 1000,
  })

  const { data: applications = [], isLoading: loadingApplied } = useQuery({
    queryKey: ['my-tasks', 'applied'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('applications')
        .select('*, task:tasks(*)')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    staleTime: 30 * 1000,
  })

  const { data: activeTasks = [], isLoading: loadingActive } = useQuery({
    queryKey: ['my-tasks', 'active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .or(`poster_id.eq.${user.id},hired_worker_id.eq.${user.id}`)
        .in('status', ['hired', 'in_progress', 'under_review'])
        .order('created_at', { ascending: false })
      return data ?? []
    },
    staleTime: 30 * 1000,
  })

  const loading =
    (tab === 'posted' && loadingPosted) ||
    (tab === 'applied' && loadingApplied) ||
    (tab === 'active' && loadingActive)

  const hireMutation = useMutation({
    mutationFn: async ({ taskId, workerId }: { taskId: string; workerId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: workerId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Failed to hire worker')
      return json.data
    },
    onSuccess: () => {
      toast.success('Worker hired!')
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const acceptMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/accept`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Failed to accept work')
      return json.data
    },
    onSuccess: () => {
      toast.success('Work accepted and payment released!')
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const tabs = [
    { key: 'posted' as const, label: `Posted (${tasks.length})` },
    { key: 'applied' as const, label: `Applied (${applications.length})` },
    { key: 'active' as const, label: `Active (${activeTasks.length})` },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>My Tasks</h1>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : tab === 'posted' ? (
        tasks.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>You haven&apos;t posted any tasks yet</p>
            <Link href="/post-task"><Button className="mt-4 bg-primary text-primary-foreground rounded-xl">Post a Task</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task: any) => (
              <Card key={task.id} className="p-5 border-border bg-card rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        task.status === 'open' ? 'bg-emerald-500/10 text-emerald-600' :
                        task.status === 'in_progress' ? 'bg-violet-500/10 text-violet-600' :
                        task.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      }`}>{task.status.replace('_', ' ')}</span>
                      {task.applicant_count > 0 && task.status === 'open' && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
                          {task.applicant_count} new applicant{task.applicant_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(task.deadline) > new Date()
                        ? `${Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)} days left`
                        : 'Deadline passed'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <p className="text-sm font-bold text-primary">{task.budget?.toLocaleString()}৳</p>
                    <Link href={`/tasks/${task.id}`}>
                      <Button size="sm" variant={task.applicant_count > 0 && task.status === 'open' ? 'default' : 'outline'} className="text-xs rounded-lg gap-1">
                        {task.applicant_count > 0 && task.status === 'open'
                          ? <><Users className="w-3 h-3" /> View Applicants</>
                          : 'View Task'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'applied' ? (
        applications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No applications yet</p>
            <Link href="/tasks"><Button className="mt-4 bg-primary text-primary-foreground rounded-xl">Browse Tasks</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app: any) => (
              <Card key={app.id} className="p-5 border-border rounded-2xl">
                <h3 className="font-semibold text-sm">{app.task?.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize font-medium">{app.status}</span></p>
              </Card>
            ))}
          </div>
        )
      ) : (
        activeTasks.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No active tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task: any) => (
              <Card key={task.id} className="p-5 border-border rounded-2xl">
                <h3 className="font-semibold text-sm">{task.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-primary">{task.status}</span></p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Link href={`/chat/${task.id}`}>
                    <Button size="sm" variant="outline" className="rounded-lg">Open Chat</Button>
                  </Link>
                  {task.status === 'under_review' && (
                    <Button size="sm" onClick={() => acceptMutation.mutate(task.id)} className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg">
                      Accept Work
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}

